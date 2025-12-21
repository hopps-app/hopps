package app.hopps.document.client;

import java.io.InputStream;

import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api/az-document-ai/document/scan")
@RegisterRestClient(configKey = "document-ai")
public interface DocumentAiClient
{
	@POST
	@Path("/invoice")
	@Consumes(MediaType.MULTIPART_FORM_DATA)
	@Produces(MediaType.APPLICATION_JSON)
	InvoiceData scanInvoice(@RestForm("document") InputStream document,
		@RestForm("transactionRecordId") Long transactionRecordId);

	@POST
	@Path("/receipt")
	@Consumes(MediaType.MULTIPART_FORM_DATA)
	@Produces(MediaType.APPLICATION_JSON)
	ReceiptData scanReceipt(@RestForm("document") InputStream document,
		@RestForm("transactionRecordId") Long transactionRecordId);
}
