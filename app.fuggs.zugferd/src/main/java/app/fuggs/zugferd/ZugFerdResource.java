package app.fuggs.zugferd;

import app.fuggs.zugferd.model.DocumentData;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.jboss.resteasy.reactive.PartType;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.xml.xpath.XPathExpressionException;
import java.io.IOException;
import java.io.InputStream;
import java.text.ParseException;

@Path("/api/zugferd")
@ApplicationScoped
public class ZugFerdResource
{
	private static final Logger LOGGER = LoggerFactory.getLogger(ZugFerdResource.class.getName());

	@Inject
	ZugFerdService service;

	@POST
	@Path("/document/scan")
	@Consumes(MediaType.MULTIPART_FORM_DATA)
	@Produces(MediaType.APPLICATION_JSON)
	@Operation(summary = "Upload and process ZUGFeRD invoice", description = "Uploads a PDF file containing a ZUGFeRD invoice and extracts its data")
	@APIResponses(value = {
		@APIResponse(responseCode = "200", description = "Document successfully processed", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = DocumentData.class))),
		@APIResponse(responseCode = "422", description = "Invalid PDF file or parsing error", content = @Content(mediaType = MediaType.APPLICATION_JSON))
	})
	public DocumentData uploadDocument(
		@RestForm("document") @Schema(type = SchemaType.OBJECT, format = "binary") FileUpload document,
		@RestForm @PartType(MediaType.TEXT_PLAIN) @Schema(description = "Transaction record ID for tracking", examples = "12345") Long transactionRecordId)
		throws IOException
	{
		try (InputStream stream = document.uploadedFile().toFile().toPath().toUri().toURL().openStream())
		{
			try
			{
				return service.scanDocument(transactionRecordId, stream);
			}
			catch (ParseException | XPathExpressionException e)
			{
				LOGGER.info("Scanning document failed (transactionRecordId={})", transactionRecordId);
				// 422 means Unprocessable Entity
				throw new WebApplicationException("Could not parse PDF", e, 422);
			}
		}
	}
}
