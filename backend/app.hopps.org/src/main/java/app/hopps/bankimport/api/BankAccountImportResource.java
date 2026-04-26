package app.hopps.bankimport.api;

import app.hopps.bankimport.api.dto.BankImportResponse;
import app.hopps.bankimport.api.dto.CsvPreviewResponse;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.service.BankImportService;
import app.hopps.bankimport.service.CsvPreviewService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.util.List;

/**
 * Per-account import endpoints: preview a CSV file, queue an import, and inspect the import history. The cross-cutting
 * status/rollback endpoints live on {@link BankImportResource} under {@code /imports}.
 */
@Authenticated
@Path("/bankaccounts/{accountId}/imports")
public class BankAccountImportResource {

    private static final Logger LOG = LoggerFactory.getLogger(BankAccountImportResource.class);

    @Inject
    BankImportService importService;

    @Inject
    CsvPreviewService csvPreviewService;

    @POST
    @Path("/preview")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Preview an uploaded CSV", description = "Synchronously decodes the file, detects encoding and delimiter, and returns the first 20 raw lines plus header columns for the schema wizard. Does not persist anything.")
    @APIResponse(responseCode = "200", description = "Preview generated", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CsvPreviewResponse.class)))
    @APIResponse(responseCode = "400", description = "File missing or unreadable")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Bank account not found")
    public CsvPreviewResponse preview(
            @PathParam("accountId") @Parameter(description = "Bank account ID") Long accountId,
            @RestForm("file") FileUpload file) {
        if (file == null || file.fileName() == null || file.fileName().isBlank()) {
            throw new BadRequestException("File is required");
        }
        byte[] content;
        try {
            content = Files.readAllBytes(file.uploadedFile());
        } catch (IOException e) {
            throw new BadRequestException("Could not read uploaded file: " + e.getMessage());
        }
        LOG.info("CSV preview requested: account={}, file={}, size={}", accountId, file.fileName(), file.size());
        return csvPreviewService.preview(content);
    }

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Queue a CSV import", description = "Uploads the file, archives it in S3, creates a BankImport job in QUEUED state and returns 202 Accepted. The worker picks it up within a few seconds. Poll GET /imports/{id} for status.")
    @APIResponse(responseCode = "202", description = "Import queued", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankImportResponse.class)))
    @APIResponse(responseCode = "400", description = "File missing, schemaId missing, or duplicate file already queued")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Account or schema not found")
    public Response createImport(
            @PathParam("accountId") @Parameter(description = "Bank account ID") Long accountId,
            @RestForm("file") FileUpload file,
            @RestForm("schemaId") @Parameter(description = "ID of the BankCsvSchema to apply") Long schemaId) {
        if (file == null || file.fileName() == null || file.fileName().isBlank()) {
            throw new BadRequestException("File is required");
        }
        if (schemaId == null) {
            throw new BadRequestException("schemaId is required");
        }
        BankImport job = importService.enqueueImport(
                accountId,
                schemaId,
                file.fileName(),
                file.size(),
                file.contentType(),
                file.uploadedFile());
        return Response.status(Response.Status.ACCEPTED)
                .entity(BankImportResponse.from(job))
                .build();
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "List imports for a bank account", description = "Returns the import history of the given account, newest first.")
    @APIResponse(responseCode = "200", description = "Import history", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankImportResponse[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Bank account not found")
    public List<BankImportResponse> listImports(
            @PathParam("accountId") @Parameter(description = "Bank account ID") Long accountId,
            @QueryParam("limit") @Parameter(description = "Maximum number of imports returned (newest first)") Integer limit) {
        List<BankImport> jobs = importService.listForAccount(accountId);
        if (limit != null && limit > 0 && jobs.size() > limit) {
            jobs = jobs.subList(0, limit);
        }
        return jobs.stream().map(BankImportResponse::from).toList();
    }
}
