package app.hopps.bankimport.api;

import app.hopps.bankimport.api.dto.BankCsvSchemaCreateRequest;
import app.hopps.bankimport.api.dto.BankCsvSchemaResponse;
import app.hopps.bankimport.api.dto.BankCsvSchemaTemplateResponse;
import app.hopps.bankimport.api.dto.BankCsvSchemaUpdateRequest;
import app.hopps.bankimport.domain.BankCsvSchema;
import app.hopps.bankimport.service.BankCsvSchemaService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

/**
 * REST API for bank CSV schema management. See bank-import-feature.md §4.4.
 */
@Authenticated
@Path("/bank-schemas")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class BankCsvSchemaResource {

    private static final Logger LOG = LoggerFactory.getLogger(BankCsvSchemaResource.class);

    @Inject
    BankCsvSchemaService schemaService;

    @GET
    @Operation(summary = "List bank CSV schemas", description = "Returns all schemas of the current organization. Archived schemas excluded by default.")
    @APIResponse(responseCode = "200", description = "List of schemas", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankCsvSchemaResponse[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    public List<BankCsvSchemaResponse> listSchemas(
            @QueryParam("includeArchived") @DefaultValue("false") @Parameter(description = "Include archived schemas") boolean includeArchived) {
        return schemaService.list(includeArchived)
                .stream()
                .map(BankCsvSchemaResponse::from)
                .toList();
    }

    @GET
    @Path("/templates")
    @Operation(summary = "List system CSV templates", description = "Returns built-in templates (Sparkasse MT940, CAMT.052 v2/v8) that can be cloned into the org via POST ?fromTemplate=...")
    @APIResponse(responseCode = "200", description = "List of system templates", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankCsvSchemaTemplateResponse[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    public List<BankCsvSchemaTemplateResponse> listTemplates() {
        return schemaService.listTemplates();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a CSV schema", description = "Returns a single CSV schema by ID")
    @APIResponse(responseCode = "200", description = "Schema found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankCsvSchemaResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Schema not found")
    public BankCsvSchemaResponse getSchema(
            @PathParam("id") @Parameter(description = "Schema ID") Long id) {
        return BankCsvSchemaResponse.from(schemaService.get(id));
    }

    @POST
    @Operation(summary = "Create a CSV schema", description = "Creates a new schema. When fromTemplate is set, the template's defaults are applied first and then overridden by request fields.")
    @APIResponse(responseCode = "201", description = "Schema created", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankCsvSchemaResponse.class)))
    @APIResponse(responseCode = "400", description = "Invalid input (missing required mappings, invalid amountStrategy combination)")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Template not found")
    public Response createSchema(
            @QueryParam("fromTemplate") @Parameter(description = "Optional template ID to clone defaults from (e.g. \"sparkasse-camt-v8\")") String fromTemplate,
            @Valid BankCsvSchemaCreateRequest request) {
        BankCsvSchema schema = schemaService.create(request, fromTemplate);
        LOG.info("Bank CSV schema created: id={}, name={}, fromTemplate={}", schema.getId(), schema.getName(),
                fromTemplate);
        return Response.status(Response.Status.CREATED)
                .entity(BankCsvSchemaResponse.from(schema))
                .build();
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Update a CSV schema", description = "Partial update — only non-null fields are applied. columnMappings (when set) fully replaces the existing list.")
    @APIResponse(responseCode = "200", description = "Schema updated", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankCsvSchemaResponse.class)))
    @APIResponse(responseCode = "400", description = "Invalid input")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Schema not found")
    public BankCsvSchemaResponse updateSchema(
            @PathParam("id") @Parameter(description = "Schema ID") Long id,
            @Valid BankCsvSchemaUpdateRequest request) {
        BankCsvSchema schema = schemaService.update(id, request);
        LOG.info("Bank CSV schema updated: id={}", schema.getId());
        return BankCsvSchemaResponse.from(schema);
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a CSV schema", description = "Hard-deletes a schema. Fails with 400 if the schema is referenced by a bank account or import — archive it via POST /archive instead.")
    @APIResponse(responseCode = "204", description = "Schema deleted")
    @APIResponse(responseCode = "400", description = "Schema is referenced and cannot be deleted")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Schema not found")
    public void deleteSchema(
            @PathParam("id") @Parameter(description = "Schema ID") Long id) {
        schemaService.delete(id);
        LOG.info("Bank CSV schema deleted: id={}", id);
    }

    @POST
    @Path("/{id}/archive")
    @Operation(summary = "Archive a CSV schema", description = "Soft-archives a schema. It stays selectable for historic imports but is hidden from default lists and cannot be picked for new accounts.")
    @APIResponse(responseCode = "204", description = "Schema archived")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Schema not found")
    public void archiveSchema(
            @PathParam("id") @Parameter(description = "Schema ID") Long id) {
        schemaService.archive(id);
        LOG.info("Bank CSV schema archived: id={}", id);
    }

    @POST
    @Path("/{id}/restore")
    @Operation(summary = "Restore an archived schema", description = "Unsets the archived flag of a schema.")
    @APIResponse(responseCode = "200", description = "Schema restored", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankCsvSchemaResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Schema not found")
    public BankCsvSchemaResponse restoreSchema(
            @PathParam("id") @Parameter(description = "Schema ID") Long id) {
        BankCsvSchema schema = schemaService.restore(id);
        LOG.info("Bank CSV schema restored: id={}", id);
        return BankCsvSchemaResponse.from(schema);
    }
}
