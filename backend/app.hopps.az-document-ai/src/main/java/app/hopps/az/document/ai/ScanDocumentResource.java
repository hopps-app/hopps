package app.hopps.az.document.ai;

import app.hopps.commons.InvoiceData;
import app.hopps.commons.ReceiptData;
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
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

@ApplicationScoped
@Path("/document/scan")
public class ScanDocumentResource {
    public static final WebApplicationException COULD_NOT_EXTRACT_DOCUMENT_EXCEPTION = new WebApplicationException(
            "Could not extract document", Response.Status.BAD_REQUEST);
    private final AzureAiService aiService;

    @Inject
    public ScanDocumentResource(AzureAiService aiService) {
        this.aiService = aiService;
    }

    @POST
    @Path("/invoice")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Scans the invoice uploaded with this request. The transactionRecordId is used for logging purposes only.", description = "Uses Azure Document AI to scan an invoice")
    @APIResponse(responseCode = "200", description = "Data about this invoice. Reference key from this should be ignored", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = InvoiceData.class)))
    @APIResponse(responseCode = "400", description = "Couldn't extract data / invalid request")
    public InvoiceData scanInvoice(@RestForm("document") FileUpload document,
            @RestForm("transactionRecordId") long transactionRecordId) {
        return aiService.scanInvoice(document.uploadedFile(), String.valueOf(transactionRecordId))
                .orElseThrow(
                        () -> new WebApplicationException("Could not extract document", Response.Status.BAD_REQUEST));
    }

    @POST
    @Path("/receipt")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Scans the receipt uploaded with this request. The transactionRecordId is used for logging purposes only.", description = "Uses Azure Document AI to scan a receipt")
    @APIResponse(responseCode = "200", description = "Data about this receipt. Reference key from this should be ignored", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ReceiptData.class)))
    @APIResponse(responseCode = "400", description = "Couldn't extract data / Invalid URL / other")
    public ReceiptData scanReceipt(@RestForm("document") FileUpload document,
            @RestForm("transactionRecordId") long transactionRecordId) {
        return aiService.scanReceipt(document.uploadedFile(), String.valueOf(transactionRecordId))
                .orElseThrow(() -> COULD_NOT_EXTRACT_DOCUMENT_EXCEPTION);
    }

}
