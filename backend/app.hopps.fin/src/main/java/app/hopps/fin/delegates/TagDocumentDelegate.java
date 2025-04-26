package app.hopps.fin.delegates;

import app.hopps.commons.Data;
import app.hopps.commons.DocumentType;
import app.hopps.fin.client.FinNarratorClient;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.util.List;

@ApplicationScoped
public class TagDocumentDelegate {

    @RestClient
    @Inject
    FinNarratorClient client;

    public List<String> tagDocument(DocumentType type, Data documentData) {
        return switch (type) {
            case INVOICE -> client.tagInvoice(documentData);
            case RECEIPT -> client.tagReceipt(documentData);
        };
    }

}
