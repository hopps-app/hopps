package app.hopps.document.messaging;

import app.hopps.document.domain.DocumentData;
import app.hopps.document.domain.DocumentType;
import app.hopps.transaction.domain.TransactionRecord;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;

@ApplicationScoped
public class DocumentProducer {
    private static final Logger LOG = LoggerFactory.getLogger(DocumentProducer.class);

    @Channel("document-out")
    Emitter<DocumentData> documentEmitter;

    @Channel("document-analysis-out")
    Emitter<DocumentAnalysisMessage> analysisEmitter;


    /**
     * Queue a document for asynchronous analysis.
     *
     * @param message the analysis message
     */
    public void queueForAnalysis(DocumentAnalysisMessage message) {
        LOG.info("Queuing document for analysis: transactionRecordId={}, documentKey={}",
                message.transactionRecordId(), message.documentKey());
        analysisEmitter.send(message);
    }
}
