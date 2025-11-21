package app.hopps.document.messaging;

import app.hopps.document.service.SubmitService;
import app.hopps.transaction.domain.AnalysisStatus;
import app.hopps.transaction.domain.TransactionRecord;
import app.hopps.transaction.domain.TransactionRecordAnalysisResult;
import app.hopps.transaction.domain.TransactionStatus;
import app.hopps.transaction.repository.AnalysisResultRepository;
import app.hopps.transaction.repository.TransactionRecordRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.Map;

/**
 * Consumer for asynchronous document analysis.
 * Listens to the document-analysis Kafka channel and processes documents in the background.
 */
@ApplicationScoped
public class DocumentAnalysisConsumer {
    private static final Logger LOG = LoggerFactory.getLogger(DocumentAnalysisConsumer.class);

    @Inject
    SubmitService submitService;

    @Inject
    TransactionRecordRepository transactionRepo;

    @Inject
    AnalysisResultRepository analysisResultRepo;

    @Inject
    AnalysisEventBroadcaster broadcaster;

    /**
     * Process a document analysis message from the Kafka queue.
     *
     * @param message the analysis message
     */
    @Incoming("document-analysis-in")
    @Transactional
    public void analyzeDocument(DocumentAnalysisMessage message) {
        LOG.info("Received document analysis message: transactionRecordId={}, documentKey={}",
                message.transactionRecordId(), message.documentKey());

        Long transactionRecordId = message.transactionRecordId();

        try {
            // Load transaction record and analysis result
            TransactionRecord tr = transactionRepo.findById(transactionRecordId);
            if (tr == null) {
                LOG.error("Transaction record not found: {}", transactionRecordId);
                return;
            }

            TransactionRecordAnalysisResult analysis = analysisResultRepo
                    .findByTransactionRecordId(transactionRecordId)
                    .orElse(null);

            if (analysis == null) {
                LOG.error("Analysis result not found for transaction record: {}", transactionRecordId);
                return;
            }

            // Update status to ANALYZING
            tr.setStatus(TransactionStatus.ANALYZING);
            analysis.setStatus(AnalysisStatus.IN_PROGRESS);
            analysis.setStartedAt(Instant.now());
            transactionRepo.persist(tr);
            analysisResultRepo.persist(analysis);

            // Perform the actual analysis (broadcasts events after each step)
            TransactionRecordAnalysisResult result = submitService.analyzeDocumentAsync(
                    transactionRecordId,
                    message.documentKey(),
                    message.type(),
                    message.contentType()
            );

            // Update transaction record status
            tr.setStatus(TransactionStatus.ANALYZED);
            result.setCompletedAt(Instant.now());
            transactionRepo.persist(tr);
            analysisResultRepo.persist(result);

            LOG.info("Document analysis completed successfully: transactionRecordId={}", transactionRecordId);

        } catch (Exception e) {
            LOG.error("Error analyzing document: transactionRecordId=" + transactionRecordId, e);

            // Update status to FAILED
            try {
                TransactionRecord tr = transactionRepo.findById(transactionRecordId);
                TransactionRecordAnalysisResult analysis = analysisResultRepo
                        .findByTransactionRecordId(transactionRecordId)
                        .orElse(null);

                if (tr != null) {
                    tr.setStatus(TransactionStatus.FAILED);
                    transactionRepo.persist(tr);
                }

                if (analysis != null) {
                    analysis.setStatus(AnalysisStatus.FAILED);
                    analysis.setErrorMessage(e.getMessage());
                    analysis.setCompletedAt(Instant.now());
                    analysisResultRepo.persist(analysis);

                    // Broadcast failure event with complete entity
                    try {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        @SuppressWarnings("unchecked")
                        Map<String, Object> entityMap = mapper.convertValue(analysis, Map.class);
                        broadcaster.broadcast(transactionRecordId, "analysis.update", entityMap);
                    } catch (Exception jsonException) {
                        LOG.error("Error broadcasting failure event", jsonException);
                    }
                }

            } catch (Exception innerException) {
                LOG.error("Error updating failure status", innerException);
            }
        }
    }

}
