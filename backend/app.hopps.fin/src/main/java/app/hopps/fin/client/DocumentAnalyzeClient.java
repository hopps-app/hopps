package app.hopps.fin.client;

import app.hopps.fin.model.InvoiceData;
import app.hopps.fin.model.ReceiptData;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.reactive.PartType;
import org.jboss.resteasy.reactive.RestForm;

@RegisterRestClient(configKey = "document-analysis")
@Path("/document/scan")
public interface DocumentAnalyzeClient {

    /**
     * @param transactionRecordId
     *            only for logging/observability purposes
     */
    @POST
    @Path("/invoice")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    InvoiceData scanInvoice(
            @RestForm @PartType(MediaType.APPLICATION_OCTET_STREAM) byte[] document,
            @RestForm long transactionRecordId);

    /**
     * @param transactionRecordId
     *            only for logging/observability purposes
     */
    @POST
    @Path("/receipt")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    ReceiptData scanReceipt(
            @RestForm @PartType(MediaType.APPLICATION_OCTET_STREAM) byte[] document,
            @RestForm long transactionRecordId);

}
