package app.hopps.fin.delegates;

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

    public void recognize(TransactionRecord transactionRecord) {
        return zugFerdClient.uploadDocument(file, referenceId);
    }
}
