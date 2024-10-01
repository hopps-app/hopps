package app.hopps;

import app.hopps.model.InvoiceData;
import app.hopps.model.ReceiptData;
import io.quarkus.arc.profile.IfBuildProfile;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;

@ApplicationScoped
@IfBuildProfile("dev")
@Path("/documents/scan")
public class DevDocumentConnector {

    @Inject
    AzureAiService aiService;

    @Path("/invoice")
    @POST
    public InvoiceData scanInvoice(String imageUrl) throws URISyntaxException, MalformedURLException {
        return aiService.scanInvoice(new URI(imageUrl).toURL());
    }

    @Path("/receipt")
    @POST
    public ReceiptData scanReceipt(String imageUrl) throws URISyntaxException, MalformedURLException {
        return aiService.scanReceipt(new URI(imageUrl).toURL());
    }

}
