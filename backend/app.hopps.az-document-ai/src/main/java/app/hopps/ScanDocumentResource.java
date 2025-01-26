package app.hopps;

import app.hopps.commons.DocumentData;
import app.hopps.commons.DocumentType;
import app.hopps.commons.InvoiceData;
import app.hopps.commons.ReceiptData;
import app.hopps.model.AnalyzeDocumentRequest;
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

@ApplicationScoped
@Path("/document/scan")
public class ScanDocumentResource {
    private final AzureAiService aiService;

    @Inject
    public ScanDocumentResource(AzureAiService aiService) {
        this.aiService = aiService;
    }

    @POST
    @Path("/invoice")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Scans the invoice at this URL", description = "Uses Azure Document AI to scan an invoice")
    @APIResponse(responseCode = "200", description = "Data about this invoice", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = InvoiceData.class)))
    @APIResponse(responseCode = "400", description = "Couldn't extract data / Invalid URL / other")
    public InvoiceData scanInvoice(AnalyzeDocumentRequest body) {
        DocumentData documentData = new DocumentData(body.parseDocumentUrl(), -1L, DocumentType.INVOICE);
        return aiService.scanInvoice(documentData)
                .orElseThrow(
                        () -> new WebApplicationException("Could not extract document", Response.Status.BAD_REQUEST));
    }

    @POST
    @Path("/receipt")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Scans the receipt at this URL", description = "Uses Azure Document AI to scan a receipt")
    @APIResponse(responseCode = "200", description = "Data about this receipt", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ReceiptData.class)))
    @APIResponse(responseCode = "400", description = "Couldn't extract data / Invalid URL / other")
    public ReceiptData scanReceipt(AnalyzeDocumentRequest body) {
        DocumentData documentData = new DocumentData(body.parseDocumentUrl(), -1L, DocumentType.RECEIPT);
        return aiService.scanReceipt(documentData)
                .orElseThrow(
                        () -> new WebApplicationException("Could not extract document", Response.Status.BAD_REQUEST));
    }

}
