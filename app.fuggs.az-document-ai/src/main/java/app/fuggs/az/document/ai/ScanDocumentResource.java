package app.fuggs.az.document.ai;

import app.fuggs.az.document.ai.model.DocumentData;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.PartType;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.slf4j.Logger;

import static org.slf4j.LoggerFactory.getLogger;

@ApplicationScoped
@Path("/document/scan")
public class ScanDocumentResource
{
	private static final Logger LOG = getLogger(ScanDocumentResource.class);

	private final AzureAiService aiService;

	@Inject
	public ScanDocumentResource(AzureAiService aiService)
	{
		this.aiService = aiService;
	}

	@POST
	@Consumes(MediaType.MULTIPART_FORM_DATA)
	@Produces(MediaType.APPLICATION_JSON)
	@Operation(summary = "Scans the document uploaded with this request", description = "Uses Azure Document AI to extract data from invoices and receipts")
	@APIResponse(responseCode = "200", description = "Extracted document data", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = DocumentData.class)))
	@APIResponse(responseCode = "400", description = "Couldn't extract data / invalid request")
	public DocumentData scanDocument(@RestForm @PartType(MediaType.APPLICATION_OCTET_STREAM) FileUpload document,
		@RestForm long transactionRecordId)
	{
		try
		{
			return aiService.scanDocument(document.uploadedFile(), String.valueOf(transactionRecordId));
		}
		catch (OcrException e)
		{
			LOG.error("Could not extract document", e);
			throw new WebApplicationException("Could not extract document", Response.Status.BAD_REQUEST);
		}
	}
}