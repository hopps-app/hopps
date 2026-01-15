package app.hopps.document.service;

import app.hopps.document.client.DocumentAiClient;
import app.hopps.document.client.DocumentData;
import app.hopps.document.client.ZugFerdClient;
import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.ExtractionSource;
import app.hopps.document.domain.TagSource;
import app.hopps.document.repository.DocumentRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.context.ManagedExecutor;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import static org.slf4j.LoggerFactory.getLogger;

/**
 * Service for asynchronous document analysis. Handles document processing using ZugFerd and AI services.
 */
@ApplicationScoped
public class DocumentAnalysisService {
    private static final Logger LOG = getLogger(DocumentAnalysisService.class);

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
