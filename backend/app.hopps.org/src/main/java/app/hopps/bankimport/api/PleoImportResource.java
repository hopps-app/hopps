package app.hopps.bankimport.api;

import app.hopps.bankimport.api.dto.PleoImportResponse;
import app.hopps.bankimport.api.dto.PleoReceiptsResponse;
import app.hopps.bankimport.service.BankImportRejectedException;
import app.hopps.bankimport.service.PleoImportService;
import app.hopps.bankimport.service.ReceiptFiles;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

/**
 * Import of a Pleo card account: Pleo's expense export (CSV) and the receipt files belonging to it.
 */
@Authenticated
@Path("/bankaccounts/{accountId}/pleo")
public class PleoImportResource {

    @Inject
    PleoImportService pleoImportService;

    @POST
    @Path("/import")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "importPleoExport", summary = "Import a Pleo expense export", description = "Imports Pleo's expense export (CSV) into a Pleo account. Each expense becomes a movement with a draft booking that is already linked to it, on the account's bommel. With a category group, the export's \"Category\" column fills it. Expenses imported before (same Expense ID) are skipped. Nothing is confirmed.")
    @APIResponse(responseCode = "200", description = "Export imported", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PleoImportResponse.class)))
    @APIResponse(responseCode = "400", description = "No Pleo account, no Pleo export, or the category group does not apply to the account's bommel")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Account or category group not found")
    @APIResponse(responseCode = "409", description = "The file was already imported into another account (code "
            + BankImportRejectedException.FILE_ALREADY_IMPORTED + ")")
    public PleoImportResponse importExport(
            @PathParam("accountId") @Parameter(description = "Pleo account ID") Long accountId,
            @RestForm("file") FileUpload file,
            @QueryParam("categoryGroupId") @Parameter(description = "Category group the export's \"Category\" column fills; omit for none") Long categoryGroupId,
            @Context SecurityContext securityContext) {
        if (file == null || file.fileName() == null || file.fileName().isBlank()) {
            throw new BadRequestException("File is required");
        }
        return pleoImportService.importExport(accountId, file.fileName(), read(file), categoryGroupId,
                username(securityContext));
    }

    @POST
    @Path("/receipts")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "attachPleoReceipts", summary = "Attach receipts to Pleo expenses", description = "Takes receipt files (PDF, PNG, JPEG) or ZIP archives of them and links each to the imported expense whose receipt number its file name carries (\"2600016.pdf\"; several files \"2600009a.pdf\", \"2600009b.pdf\", merged into one PDF). Each receipt is analysed. An expense whose booking has a receipt already or is confirmed is left alone.")
    @APIResponse(responseCode = "200", description = "Receipts attached as far as possible", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PleoReceiptsResponse.class)))
    @APIResponse(responseCode = "400", description = "No Pleo account or no files")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Account not found")
    public PleoReceiptsResponse attachReceipts(
            @PathParam("accountId") @Parameter(description = "Pleo account ID") Long accountId,
            @RestForm("files") List<FileUpload> files,
            @Context SecurityContext securityContext) {
        if (files == null || files.isEmpty()) {
            throw new BadRequestException("Files are required");
        }
        List<ReceiptFiles.Upload> uploads = new ArrayList<>();
        for (FileUpload file : files) {
            uploads.add(new ReceiptFiles.Upload(file.fileName(), read(file)));
        }
        return pleoImportService.attachReceipts(accountId, uploads, username(securityContext));
    }

    private static byte[] read(FileUpload file) {
        try {
            return Files.readAllBytes(file.uploadedFile());
        } catch (IOException e) {
            throw new BadRequestException("Could not read uploaded file: " + e.getMessage());
        }
    }

    private static String username(SecurityContext securityContext) {
        return securityContext.getUserPrincipal() != null ? securityContext.getUserPrincipal().getName() : "unknown";
    }
}
