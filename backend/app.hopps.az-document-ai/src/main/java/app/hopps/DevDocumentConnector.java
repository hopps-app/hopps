package app.hopps;

import app.hopps.commons.DocumentData;
import app.hopps.commons.DocumentType;
import app.hopps.commons.InvoiceData;
import app.hopps.commons.ReceiptData;
import io.quarkus.arc.profile.IfBuildProfile;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;

@ApplicationScoped
@IfBuildProfile("dev")
@Path("/documents/scan")
public class DevDocumentConnector {
    private final AzureAiService aiService;

    @Inject
    public DevDocumentConnector(AzureAiService aiService) {
        this.aiService = aiService;
    }

    @Path("/invoice")
    @POST
    public InvoiceData scanInvoice(String imageUrl) throws URISyntaxException, MalformedURLException {
        DocumentData documentData = new DocumentData(new URI(imageUrl).toURL(), -1L, DocumentType.INVOICE);
        return aiService.scanInvoice(documentData);
    }

    @Path("/receipt")
    @POST
    public ReceiptData scanReceipt(String imageUrl) throws URISyntaxException, MalformedURLException {
        DocumentData documentData = new DocumentData(new URI(imageUrl).toURL(), -1L, DocumentType.RECEIPT);
        return aiService.scanReceipt(documentData);
    }

}
