package app.hopps.bankimport.api;

import app.hopps.bankimport.api.dto.BankImportResponse;
import app.hopps.bankimport.service.BankImportService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Cross-account import endpoints: status polling and rollback. Used by the wizard's progress polling and the "remove a
 * botched import" admin action.
 */
@Authenticated
@Path("/imports")
@Produces(MediaType.APPLICATION_JSON)
public class BankImportResource {

    private static final Logger LOG = LoggerFactory.getLogger(BankImportResource.class);

    @Inject
    BankImportService importService;

    @GET
    @Path("/{id}")
    @Operation(summary = "Get import status", description = "Returns the live status of an import job (progress, counters, error report). Always responds with HTTP 200 — clients inspect the status field rather than the HTTP code.")
    @APIResponse(responseCode = "200", description = "Import status", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankImportResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Import not found")
    public BankImportResponse getStatus(
            @PathParam("id") @Parameter(description = "Import ID") Long id) {
        return BankImportResponse.from(importService.get(id));
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Rollback an import", description = "Deletes all transactions created by this import and removes the import record itself. Allowed only for finished imports (COMPLETED / PARTIAL / FAILED).")
    @APIResponse(responseCode = "204", description = "Import rolled back")
    @APIResponse(responseCode = "400", description = "Import is still QUEUED or PROCESSING")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Import not found")
    public void rollbackImport(
            @PathParam("id") @Parameter(description = "Import ID") Long id) {
        importService.rollback(id);
        LOG.info("Bank import rolled back: id={}", id);
    }
}
