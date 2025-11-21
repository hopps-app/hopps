package app.hopps.document.service;

import app.hopps.document.client.DocumentAnalyzeClient;
import app.hopps.document.client.FinNarratorClient;
import app.hopps.document.client.ZugFerdClient;
import app.hopps.document.domain.Data;
import app.hopps.document.domain.DocumentType;
import app.hopps.shared.infrastructure.storage.S3Handler;
import app.hopps.transaction.domain.AnalysisStatus;
import app.hopps.transaction.domain.TransactionRecord;
import app.hopps.transaction.domain.TransactionRecordAnalysisResult;
import app.hopps.transaction.repository.AnalysisResultRepository;
import app.hopps.transaction.repository.TransactionRecordRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.InternalServerErrorException;
import jakarta.ws.rs.WebApplicationException;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

/**
 * This is responsible for handling uploaded documents.
 */
@ApplicationScoped
public class SubmitService {
    private static final Logger LOGGER = LoggerFactory.getLogger(SubmitService.class);

    @Inject
    TransactionRecordRepository transactionRepo;

    @Inject
    AnalysisResultRepository analysisResultRepo;

    @Inject
    S3Handler s3Handler;

    @Inject
    @RestClient
    ZugFerdClient zugFerdClient;

    @Inject
    @RestClient
    DocumentAnalyzeClient documentAnalyzeClient;

    @Inject
    @RestClient
    FinNarratorClient finNarratorClient;

    @Inject
    app.hopps.document.messaging.AnalysisEventBroadcaster broadcaster;

    @Inject
    com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Transactional
    public TransactionRecord submitDocument(DocumentSubmissionRequest request) {
        LOGGER.info("Starting analysis of document (documentKey={}), request: {}", request.documentKey(),
                request);
        // Save in a database
        TransactionRecord transactionRecord = new TransactionRecord(BigDecimal.ZERO, request.type(),
                request.submitterUserName());
        transactionRecord.setDocumentKey(request.documentKey());
        transactionRecord.setPrivatelyPaid(request.privatelyPaid());
        transactionRecord.setBommelId(request.bommelId);

        transactionRepo.persist(transactionRecord);

        Data extractedDocumentData = null;

        if (request.contentType().equals("application/pdf") && request.type() == DocumentType.INVOICE) {
            // User uploaded a .pdf file, we might be able to extract a ZugFerd eRechnung from this.
            LOGGER.info("Trying to extract zugferd data from document... (documentKey={})", request.documentKey());
            try {
                extractedDocumentData = zugFerdClient.uploadDocument(request.fileContents(), transactionRecord.getId());
            } catch (WebApplicationException e) {
                if (e.getResponse().getStatus() != ZugFerdClient.STATUS_CODE_UNSUCCESSFUL_PARSE) {
                    // Here, something other went wrong, other than the pdf just not being an e-Rechnung.
                    // We can still analyse this pdf using other methods, so we don't short-circuit and throw the error.
                    LOGGER.error("Error while uploading document to zugferd: ", e);
                }
            }
        }

        if (extractedDocumentData == null) {
            LOGGER.info("Trying to extract data from document using the document analysis service... (documentKey={})",
                    request.documentKey());
            try {
                extractedDocumentData = switch (request.type()) {
                    case INVOICE ->
                            documentAnalyzeClient.scanInvoice(request.fileContents(), transactionRecord.getId());
                    case RECEIPT ->
                            documentAnalyzeClient.scanReceipt(request.fileContents(), transactionRecord.getId());
                };
            } catch (WebApplicationException e) {
                LOGGER.error("Error while uploading document to analysis service:", e);
                throw new InternalServerErrorException("Error while uploading document to analysis service", e);
            }
        }

        // Update transaction record with extracted data (only sets if null)
        extractedDocumentData.updateTransactionRecord(transactionRecord);

        // Determine the appropriate tags
        LOGGER.info("Determining tags... (documentKey={})", request.documentKey());
        List<String> tags = switch (request.type()) {
            case INVOICE -> finNarratorClient.tagInvoice(extractedDocumentData);
            case RECEIPT -> finNarratorClient.tagReceipt(extractedDocumentData);
        };
        transactionRecord.setTags(new HashSet<>(tags));

        transactionRepo.persistAndFlush(transactionRecord);

        LOGGER.info("Finished analysis of document (documentKey={})", request.documentKey());

        return transactionRecord;
    }

    /**
     * Analyze a document asynchronously and update the transaction record and analysis result.
     * This is called by the async consumer after the document has been uploaded.
     * Broadcasts SSE events after each analysis step.
     *
     * @param transactionRecordId the ID of the transaction record
     * @param documentKey         the S3 key of the uploaded document
     * @param type                the document type
     * @param contentType         the MIME type
     * @return the analysis result
     */
    @Transactional
    public TransactionRecordAnalysisResult analyzeDocumentAsync(
            Long transactionRecordId,
            String documentKey,
            DocumentType type,
            String contentType) {

        LOGGER.info("Starting async analysis of document (documentKey={}, transactionRecordId={})",
                documentKey, transactionRecordId);

        TransactionRecord transactionRecord = transactionRepo.findById(transactionRecordId);
        if (transactionRecord == null) {
            throw new IllegalArgumentException("Transaction record not found: " + transactionRecordId);
        }

        TransactionRecordAnalysisResult analysisResult = analysisResultRepo
                .findByTransactionRecordId(transactionRecordId)
                .orElseThrow(() -> new IllegalArgumentException("Analysis result not found: " + transactionRecordId));

        try {
            // Get file contents from S3
            byte[] fileContents = s3Handler.getFile(documentKey);

            Data extractedDocumentData = null;

            // STEP 1: Try ZugFerd extraction for PDF invoices
            if (contentType.equals("application/pdf") && type == DocumentType.INVOICE) {
                analysisResult.updateStepProgress(app.hopps.transaction.domain.AnalysisStep.ZUGFERD_EXTRACTION,
                        app.hopps.transaction.domain.StepStatus.IN_PROGRESS);
                analysisResultRepo.persistAndFlush(analysisResult);
                broadcastAnalysisUpdate(transactionRecordId, analysisResult);

                LOGGER.info("Trying to extract zugferd data from document... (documentKey={})", documentKey);
                try {
                    extractedDocumentData = zugFerdClient.uploadDocument(fileContents, transactionRecordId);
                    analysisResult.setExtractionMethod("ZUGFERD");
                    analysisResult.updateStepProgress(app.hopps.transaction.domain.AnalysisStep.ZUGFERD_EXTRACTION,
                            app.hopps.transaction.domain.StepStatus.COMPLETED);
                    analysisResultRepo.persistAndFlush(analysisResult);
                    broadcastAnalysisUpdate(transactionRecordId, analysisResult);
                } catch (WebApplicationException e) {
                    if (e.getResponse().getStatus() == ZugFerdClient.STATUS_CODE_UNSUCCESSFUL_PARSE) {
                        // Not a ZugFerd PDF, skip this step
                        analysisResult.updateStepProgress(app.hopps.transaction.domain.AnalysisStep.ZUGFERD_EXTRACTION,
                                app.hopps.transaction.domain.StepStatus.SKIPPED);
                    } else {
                        LOGGER.error("Error while uploading document to zugferd: ", e);
                        analysisResult.updateStepProgress(app.hopps.transaction.domain.AnalysisStep.ZUGFERD_EXTRACTION,
                                app.hopps.transaction.domain.StepStatus.FAILED);
                    }
                    analysisResultRepo.persistAndFlush(analysisResult);
                    broadcastAnalysisUpdate(transactionRecordId, analysisResult);
                }
            } else {
                // Skip ZugFerd for non-PDF or non-invoice
                analysisResult.updateStepProgress(app.hopps.transaction.domain.AnalysisStep.ZUGFERD_EXTRACTION,
                        app.hopps.transaction.domain.StepStatus.SKIPPED);
                analysisResultRepo.persistAndFlush(analysisResult);
                broadcastAnalysisUpdate(transactionRecordId, analysisResult);
            }

            // STEP 2: Fall back to Azure Document Intelligence if needed
            if (extractedDocumentData == null) {
                analysisResult.updateStepProgress(app.hopps.transaction.domain.AnalysisStep.AZURE_EXTRACTION,
                        app.hopps.transaction.domain.StepStatus.IN_PROGRESS);
                analysisResultRepo.persistAndFlush(analysisResult);
                broadcastAnalysisUpdate(transactionRecordId, analysisResult);

                LOGGER.info("Trying to extract data from document using the document analysis service... (documentKey={})",
                        documentKey);
                try {
                    extractedDocumentData = switch (type) {
                        case INVOICE -> documentAnalyzeClient.scanInvoice(fileContents, transactionRecordId);
                        case RECEIPT -> documentAnalyzeClient.scanReceipt(fileContents, transactionRecordId);
                    };
                    analysisResult.setExtractionMethod("AZURE");
                    analysisResult.updateStepProgress(app.hopps.transaction.domain.AnalysisStep.AZURE_EXTRACTION,
                            app.hopps.transaction.domain.StepStatus.COMPLETED);
                    analysisResultRepo.persistAndFlush(analysisResult);
                    broadcastAnalysisUpdate(transactionRecordId, analysisResult);
                } catch (WebApplicationException e) {
                    LOGGER.error("Error while uploading document to analysis service:", e);
                    analysisResult.setStatus(AnalysisStatus.FAILED);
                    analysisResult.setErrorMessage("Azure analysis failed: " + e.getMessage());
                    analysisResult.updateStepProgress(app.hopps.transaction.domain.AnalysisStep.AZURE_EXTRACTION,
                            app.hopps.transaction.domain.StepStatus.FAILED);
                    analysisResultRepo.persistAndFlush(analysisResult);
                    broadcastAnalysisUpdate(transactionRecordId, analysisResult);
                    throw new InternalServerErrorException("Error while uploading document to analysis service", e);
                }
            } else {
                // Skip Azure since ZugFerd succeeded
                analysisResult.updateStepProgress(app.hopps.transaction.domain.AnalysisStep.AZURE_EXTRACTION,
                        app.hopps.transaction.domain.StepStatus.SKIPPED);
                analysisResultRepo.persistAndFlush(analysisResult);
                broadcastAnalysisUpdate(transactionRecordId, analysisResult);
            }

            // STEP 3: Generate tags using AI
            analysisResult.updateStepProgress(app.hopps.transaction.domain.AnalysisStep.TAGGING,
                    app.hopps.transaction.domain.StepStatus.IN_PROGRESS);
            analysisResultRepo.persistAndFlush(analysisResult);
            broadcastAnalysisUpdate(transactionRecordId, analysisResult);

            LOGGER.info("Determining tags... (documentKey={})", documentKey);
            List<String> tags = switch (type) {
                case INVOICE -> finNarratorClient.tagInvoice(extractedDocumentData);
                case RECEIPT -> finNarratorClient.tagReceipt(extractedDocumentData);
            };

            // Store extracted data in analysis result (frontend will decide what to save)
            Map<String, Object> extractedDataMap = buildExtractedDataMap(extractedDocumentData, tags, type);
            analysisResult.setExtractedData(extractedDataMap);
            analysisResult.updateStepProgress(app.hopps.transaction.domain.AnalysisStep.TAGGING,
                    app.hopps.transaction.domain.StepStatus.COMPLETED);
            analysisResult.setStatus(AnalysisStatus.COMPLETED);

            // Don't update transactionRecord here - frontend decides what to save via PATCH
            analysisResultRepo.persistAndFlush(analysisResult);
            broadcastAnalysisUpdate(transactionRecordId, analysisResult);

            LOGGER.info("Finished analysis of document (documentKey={})", documentKey);
            return analysisResult;

        } catch (Exception e) {
            LOGGER.error("Error analyzing document: ", e);
            analysisResult.setStatus(AnalysisStatus.FAILED);
            analysisResult.setErrorMessage(e.getMessage());
            analysisResultRepo.persistAndFlush(analysisResult);
            broadcastAnalysisUpdate(transactionRecordId, analysisResult);
            throw e;
        }
    }

    /**
     * Broadcast an analysis update via SSE with the complete AnalysisResult entity.
     */
    private void broadcastAnalysisUpdate(Long transactionRecordId, TransactionRecordAnalysisResult analysisResult) {
        try {
            // Convert entity to Map so Jackson can serialize it properly in the SSE event
            @SuppressWarnings("unchecked")
            Map<String, Object> entityMap = objectMapper.convertValue(analysisResult, Map.class);
            broadcaster.broadcast(transactionRecordId, "analysis.update", entityMap);
        } catch (Exception e) {
            LOGGER.error("Error broadcasting analysis update", e);
        }
    }

    /**
     * Convert extracted data to a Map for JSON storage in AnalysisResult.
     */
    private Map<String, Object> buildExtractedDataMap(Data data, List<String> tags, DocumentType type) {
        Map<String, Object> map = new HashMap<>();

        if (data instanceof app.hopps.document.domain.InvoiceData invoiceData) {
            map.put("total", invoiceData.total().toString());
            map.put("invoiceDate", invoiceData.invoiceDate().toString());
            map.put("currencyCode", invoiceData.currencyCode());
            invoiceData.customerName().ifPresent(name -> map.put("customerName", name));
            invoiceData.purchaseOrderNumber().ifPresent(po -> map.put("purchaseOrderNumber", po));
            invoiceData.invoiceId().ifPresent(id -> map.put("invoiceId", id));
            invoiceData.dueDate().ifPresent(date -> map.put("dueDate", date.toString()));
            invoiceData.amountDue().ifPresent(amount -> map.put("amountDue", amount.toString()));
            invoiceData.sender().ifPresent(sender -> map.put("sender", tradePartyToMap(sender)));
            invoiceData.receiver().ifPresent(receiver -> map.put("receiver", tradePartyToMap(receiver)));
        } else if (data instanceof app.hopps.document.domain.ReceiptData receiptData) {
            map.put("total", receiptData.total().toString());
            receiptData.storeName().ifPresent(name -> map.put("storeName", name));
            receiptData.storeAddress().ifPresent(addr -> map.put("storeAddress", tradePartyToMap(addr)));
            receiptData.transactionTime().ifPresent(time -> map.put("transactionTime", time.toString()));
        }

        map.put("tags", tags);
        map.put("documentType", type.toString());

        return map;
    }

    /**
     * Convert TradeParty to Map for JSON serialization.
     */
    private Map<String, Object> tradePartyToMap(app.hopps.transaction.domain.TradeParty party) {
        Map<String, Object> map = new HashMap<>();
        if (party.getName() != null) map.put("name", party.getName());
        if (party.getCountry() != null) map.put("country", party.getCountry());
        if (party.getState() != null) map.put("state", party.getState());
        if (party.getCity() != null) map.put("city", party.getCity());
//        if (party.getZip() != null) map.put("zip", party.getZip());
        if (party.getStreet() != null) map.put("street", party.getStreet());
//        if (party.getTaxId() != null) map.put("taxId", party.getTaxId());
//        if (party.getVatId() != null) map.put("vatId", party.getVatId());
        return map;
    }

    public record DocumentSubmissionRequest(
            String documentKey,
            long bommelId,
            DocumentType type,
            boolean privatelyPaid,
            String submitterUserName,
            String contentType,
            byte[] fileContents) {

        @Override
        public String toString() {
            return "DocumentSubmissionRequest{" +
                    "documentKey='" + documentKey + '\'' +
                    ", bommelId=" + bommelId +
                    ", type=" + type +
                    ", privatelyPaid=" + privatelyPaid +
                    ", submitterUserName='" + submitterUserName + '\'' +
                    ", contentType='" + contentType + '\'' +
                    ", fileContents=[Array with length " + fileContents.length + "]" +
                    '}';
        }
    }
}
