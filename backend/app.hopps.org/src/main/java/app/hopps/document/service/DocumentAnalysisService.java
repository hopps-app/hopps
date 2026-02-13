package app.hopps.document.service;

import app.hopps.document.client.DocumentAiClient;
import app.hopps.document.client.DocumentData;
import app.hopps.document.client.TradePartyData;
import app.hopps.document.client.ZugFerdClient;
import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.ExtractionSource;
import app.hopps.document.domain.TagSource;
import app.hopps.document.repository.DocumentRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.context.ManagedExecutor;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.slf4j.LoggerFactory.getLogger;

/**
 * Service for asynchronous document analysis. Handles document processing using ZugFerd and AI services. In dev mode,
 * falls back to basic filename-based analysis when external AI services are unavailable.
 */
@ApplicationScoped
public class DocumentAnalysisService {
    private static final Logger LOG = getLogger(DocumentAnalysisService.class);

    @ConfigProperty(name = "app.hopps.analysis.dev-fallback.enabled", defaultValue = "false")
    boolean devFallbackEnabled;

    @Inject
    ManagedExecutor executor;

    @Inject
    DocumentRepository documentRepository;

    @Inject
    StorageService storageService;

    @Inject
    DocumentDataApplier dataApplier;

    @Inject
    @RestClient
    ZugFerdClient zugFerdClient;

    @Inject
    @RestClient
    DocumentAiClient documentAiClient;

    /**
     * Triggers async document analysis. Returns immediately, analysis runs in background thread.
     *
     * @param documentId
     *            the ID of the document to analyze
     */
    public void analyzeAsync(Long documentId) {
        LOG.info("Scheduling async analysis for document: id={}", documentId);
        executor.runAsync(() -> {
            try {
                analyzeDocument(documentId);
            } catch (Exception e) {
                LOG.error("Unhandled exception during document analysis: id={}", documentId, e);
            }
        });
    }

    /**
     * Performs synchronous document analysis. This method runs in a separate transaction to ensure changes are
     * persisted.
     *
     * @param documentId
     *            the ID of the document to analyze
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void analyzeDocument(Long documentId) {
        Document document = documentRepository.findById(documentId);
        if (document == null) {
            LOG.warn("Document not found for analysis: id={}", documentId);
            return;
        }

        if (!document.hasFile()) {
            LOG.warn("Document has no file to analyze: id={}", documentId);
            document.setAnalysisStatus(AnalysisStatus.SKIPPED);
            return;
        }

        LOG.info("Starting document analysis: id={}, fileName={}", documentId, document.getFileName());
        document.setAnalysisStatus(AnalysisStatus.ANALYZING);

        try {
            DocumentData data = null;
            ExtractionSource source = null;

            // Try ZugFerd first for PDF files
            if (document.isPdf()) {
                LOG.debug("Attempting ZugFerd extraction for document: id={}", documentId);
                try (ResponseInputStream<GetObjectResponse> fileStream = storageService
                        .downloadFile(document.getFileKey())) {
                    data = zugFerdClient.scanDocument(fileStream, documentId);
                    source = ExtractionSource.ZUGFERD;
                    LOG.info("ZugFerd extraction successful: id={}", documentId);
                } catch (Exception e) {
                    LOG.info("ZugFerd extraction failed (will fallback to AI): id={}, error={}", documentId,
                            e.getMessage());
                    // Continue to AI fallback
                }
            }

            // Fallback to AI analysis
            if (data == null) {
                LOG.debug("Attempting AI analysis for document: id={}", documentId);
                try (ResponseInputStream<GetObjectResponse> fileStream = storageService
                        .downloadFile(document.getFileKey())) {
                    data = documentAiClient.scanDocument(fileStream, documentId);
                    source = ExtractionSource.AI;
                    LOG.info("AI analysis successful: id={}", documentId);
                } catch (Exception e) {
                    LOG.info("AI analysis failed: id={}, error={}", documentId, e.getMessage());
                    // If dev fallback is enabled, generate basic analysis data
                    if (devFallbackEnabled) {
                        LOG.info("Using dev fallback analysis for document: id={}", documentId);
                        data = generateDevFallbackData(document);
                        source = ExtractionSource.AI;
                    } else {
                        throw e;
                    }
                }
            }

            // Apply extracted data to document
            if (data != null) {
                dataApplier.applyDocumentData(document, data, TagSource.AI);
                document.setExtractionSource(source);
                document.setAnalysisStatus(AnalysisStatus.COMPLETED);
                LOG.info("Document analysis completed: id={}, source={}", documentId, source);
            } else {
                document.setAnalysisStatus(AnalysisStatus.COMPLETED);
                LOG.info("Document analysis completed with no data extracted: id={}", documentId);
            }
        } catch (Exception e) {
            LOG.error("Document analysis failed: id={}", documentId, e);
            document.setAnalysisStatus(AnalysisStatus.FAILED);
            document.setAnalysisError(e.getMessage());
        }
    }

    /**
     * Generates basic analysis data from the document filename and metadata. Used as a dev-mode fallback when external
     * AI services are unavailable. Extracts a reasonable vendor name from the filename and generates sample financial
     * data.
     *
     * @param document
     *            the document to analyze
     *
     * @return DocumentData with basic extracted information
     */
    private DocumentData generateDevFallbackData(Document document) {
        String fileName = document.getFileName();
        // Remove extension and clean up filename for use as document name
        String baseName = fileName;
        int lastDot = baseName.lastIndexOf('.');
        if (lastDot > 0) {
            baseName = baseName.substring(0, lastDot);
        }
        // Replace common separators with spaces
        baseName = baseName.replace('-', ' ').replace('_', ' ');

        // Generate a vendor name from the filename
        String vendorName = "Lieferant " + baseName;
        if (vendorName.length() > 100) {
            vendorName = vendorName.substring(0, 100);
        }

        return new DocumentData(
                new BigDecimal("119.00"), // total (brutto)
                "EUR",
                LocalDate.now(),
                LocalTime.of(10, 0),
                "DEV-" + document.getId(), // documentId reference
                vendorName,
                null, // merchantAddress - skip to avoid TradeParty persistence ordering issues
                null, // merchantTaxId
                null, // customerName
                null, // customerId
                null, // customerAddress
                null, // billingAddress
                null, // shippingAddress
                new BigDecimal("100.00"), // subTotal (netto)
                new BigDecimal("19.00"), // totalTax (MwSt)
                null, // totalDiscount
                null, // previousUnpaidBalance
                null, // purchaseOrderNumber
                null, // paymentTerm
                null, // serviceStartDate
                null, // serviceEndDate
                List.of("Rechnung", "Automatisch erkannt") // tags
        );
    }

    /**
     * Marks a document as failed analysis with an error message.
     *
     * @param document
     *            the document
     * @param errorMessage
     *            the error message to display to the user
     */
    public void markAnalysisFailed(Document document, String errorMessage) {
        document.setAnalysisStatus(AnalysisStatus.FAILED);
        document.setAnalysisError(errorMessage);
        LOG.warn("Document analysis marked as failed: documentId={}, error={}", document.getId(), errorMessage);
    }
}
