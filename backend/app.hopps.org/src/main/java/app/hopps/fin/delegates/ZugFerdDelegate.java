package app.hopps.fin.delegates;

import app.hopps.commons.InvoiceData;
import app.hopps.fin.S3Handler;
import app.hopps.fin.client.ZugFerdClient;
import app.hopps.fin.jpa.entities.TransactionRecord;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;

@ApplicationScoped
public class ZugFerdDelegate {

    @Inject
    @RestClient
    ZugFerdClient zugFerdClient;

    @Inject
    S3Handler s3Handler;

    public InvoiceData recognize(TransactionRecord transactionRecord) {
        String documentKey = transactionRecord.getDocumentKey();
        byte[] fileAsBytes = s3Handler.getFile(documentKey);
        Long referenceKey = -1L; // not persisted yet, no ID yet
        return zugFerdClient.uploadDocument(fileAsBytes, referenceKey);
    }
}
