package app.hopps.fin.bpmn;

import app.hopps.fin.client.DocumentAnalyzeClient;
import app.hopps.fin.client.FinNarratorClient;
import app.hopps.fin.client.ZugFerdClient;
import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import app.hopps.fin.model.Data;
import app.hopps.fin.model.DocumentType;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;

/**
 * This is responsible for handling uploaded documents.
 */
@ApplicationScoped
public class SubmitService {
    private static final Logger LOGGER = LoggerFactory.getLogger(SubmitService.class);

    @Inject
    TransactionRecordRepository transactionRepo;

    @Inject
    @RestClient
    ZugFerdClient zugFerdClient;

    @Inject
    @RestClient
    DocumentAnalyzeClient documentAnalyzeClient;

    @Inject
    @RestClient
    FinNarratorClient finNarratorClient;

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
                throw e;
            }
        }

        extractedDocumentData.updateTransactionRecord(transactionRecord);

        LOGGER.info("Determining tags... (documentKey={})", request.documentKey());
        // Determine the appropriate tags
        List<String> tags = switch (request.type()) {
            case INVOICE -> finNarratorClient.tagInvoice(extractedDocumentData);
            case RECEIPT -> finNarratorClient.tagReceipt(extractedDocumentData);
        };

        transactionRecord.setTags(new HashSet<>(tags));
        transactionRepo.persistAndFlush(transactionRecord);

        LOGGER.info("Finished analysis of document (documentKey={})", request.documentKey());

        return transactionRecord;
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
