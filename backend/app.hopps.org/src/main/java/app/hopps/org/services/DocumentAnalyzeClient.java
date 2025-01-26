package app.hopps.org.services;

import app.hopps.commons.InvoiceData;
import app.hopps.commons.ReceiptData;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@RegisterRestClient(configKey = "document-analysis")
@Path("/document/scan")
public interface DocumentAnalyzeClient {

    @POST
    @Path("/invoice")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    InvoiceData scanInvoice(AnalyzeDocumentRequest body);

    @POST
    @Path("/receipt")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    ReceiptData scanReceipt(AnalyzeDocumentRequest body);

}
