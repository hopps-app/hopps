package app.hopps.document.service;

import app.hopps.document.domain.DocumentCreatedEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.event.TransactionPhase;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Observes document lifecycle events and triggers appropriate actions. Uses TransactionPhase.AFTER_SUCCESS to ensure
 * the document is committed before processing.
 */
@ApplicationScoped
public class DocumentEventObserver {
    private static final Logger LOG = LoggerFactory.getLogger(DocumentEventObserver.class);

    @Inject
    DocumentAnalysisService analysisService;

    /**
     * Handles document created events after the transaction has successfully committed. This ensures the document is
     * visible to the analysis service's new transaction.
     *
     * @param event
     *            the document created event
     */
    public void onDocumentCreated(@Observes(during = TransactionPhase.AFTER_SUCCESS) DocumentCreatedEvent event) {
        LOG.info("Document created event received after commit: documentId={}", event.documentId());
        analysisService.analyzeAsync(event.documentId());
    }
}
