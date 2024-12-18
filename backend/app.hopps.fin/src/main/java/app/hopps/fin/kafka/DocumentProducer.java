package app.hopps.fin.kafka;

import app.hopps.fin.jpa.entities.TransactionRecord;
import app.hopps.fin.kafka.model.DocumentData;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;

@ApplicationScoped
public class DocumentProducer {
    @Channel("document-out")
    Emitter<DocumentData> documentEmitter;

    public void sendToProcess(TransactionRecord transactionRecord, String type) {
        String internalFinUrl = "http://fin/document/" + transactionRecord.getDocumentKey();
        DocumentData documentData = new DocumentData(internalFinUrl, transactionRecord.getId(), type);
        documentEmitter.send(documentData);
    }
}
