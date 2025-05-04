package app.hopps.fin.kafka;

import app.hopps.fin.jpa.entities.TransactionRecord;
import app.hopps.fin.model.DocumentData;
import app.hopps.fin.model.DocumentType;
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

    @ConfigProperty(name = "app.hopps.fin.url")
    String finUrl;

    public void sendToProcess(TransactionRecord transactionRecord, DocumentType type) {
        try {
            URL internalFinUrl = URI.create(finUrl + "/document/" + transactionRecord.getDocumentKey()).toURL();
            DocumentData documentData = new DocumentData(internalFinUrl, transactionRecord.getId(), type);
            documentEmitter.send(documentData);
        } catch (MalformedURLException e) {
            LOG.warn("URL is malformed, sending to kafka failed", e);
        }
    }
}
