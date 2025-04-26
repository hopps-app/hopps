package app.hopps.zugferd;

import app.hopps.commons.InvoiceData;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
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

import javax.xml.xpath.XPathExpressionException;
import java.io.IOException;
import java.io.InputStream;
import java.text.ParseException;

@Path("zugferd")
@ApplicationScoped
public class ZugFerdResource {

    @Inject
    ZugFerdService service;

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Upload and process ZUGFeRD invoice", description = "Uploads a PDF file containing a ZUGFeRD invoice and extracts its data")
    @APIResponses(value = {
            @APIResponse(responseCode = "200", description = "Invoice successfully processed", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = InvoiceData.class))),
            @APIResponse(responseCode = "422", description = "Invalid PDF file or parsing error", content = @Content(mediaType = MediaType.APPLICATION_JSON))
    })
    public InvoiceData uploadDocument(
            @RestForm("file") @Schema(type = SchemaType.OBJECT, format = "binary") FileUpload file,
            @RestForm @PartType(MediaType.TEXT_PLAIN) @Schema(description = "Reference ID for the invoice", examples = "12345") Long referenceId)
            throws IOException {

        try (InputStream stream = file.uploadedFile().toFile().toPath().toUri().toURL().openStream()) {
            try {
                return service.scanInvoice(referenceId, stream);
            } catch (ParseException | XPathExpressionException e) {
                throw new WebApplicationException("Could not parse PDF", e, 422); // 422: Unprocessable Entity
            }
        }
    }
}
