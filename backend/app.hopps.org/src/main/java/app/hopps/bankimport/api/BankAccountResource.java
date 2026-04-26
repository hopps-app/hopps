package app.hopps.bankimport.api;

import app.hopps.bankimport.api.dto.BankAccountCreateRequest;
import app.hopps.bankimport.api.dto.BankAccountResponse;
import app.hopps.bankimport.api.dto.BankAccountUpdateRequest;
import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.service.BankAccountService;
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
 * REST API for bank account management. See bank-import-feature.md §4.4.
 */
@Authenticated
@Path("/bankaccounts")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class BankAccountResource {

    private static final Logger LOG = LoggerFactory.getLogger(BankAccountResource.class);

    @Inject
    BankAccountService bankAccountService;

    @GET
    @Operation(summary = "List bank accounts", description = "Returns all bank accounts of the current organization. Archived accounts are excluded by default.")
    @APIResponse(responseCode = "200", description = "List of bank accounts", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankAccountResponse[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    public List<BankAccountResponse> listBankAccounts(
            @QueryParam("includeArchived") @DefaultValue("false") @Parameter(description = "Include archived (soft-deleted) accounts") boolean includeArchived) {
        return bankAccountService.list(includeArchived)
                .stream()
                .map(BankAccountResponse::from)
                .toList();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a bank account", description = "Returns a single bank account by ID")
    @APIResponse(responseCode = "200", description = "Bank account found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankAccountResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Bank account not found")
    public BankAccountResponse getBankAccount(
            @PathParam("id") @Parameter(description = "Bank account ID") Long id) {
        BankAccount account = bankAccountService.get(id);
        return BankAccountResponse.from(account);
    }

    @POST
    @Operation(summary = "Create a bank account", description = "Creates a new bank account. If bommelId is omitted, the account is attached to the organization's root bommel.")
    @APIResponse(responseCode = "201", description = "Bank account created", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankAccountResponse.class)))
    @APIResponse(responseCode = "400", description = "Invalid input (e.g. duplicate IBAN, invalid IBAN format)")
    @APIResponse(responseCode = "401", description = "User not logged in")
    public Response createBankAccount(@Valid BankAccountCreateRequest request) {
        BankAccount account = bankAccountService.create(request);
        LOG.info("Bank account created: id={}, iban={}", account.getId(), account.getIban());
        return Response.status(Response.Status.CREATED)
                .entity(BankAccountResponse.from(account))
                .build();
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Update a bank account", description = "Partial update — only non-null fields are applied (PATCH semantics).")
    @APIResponse(responseCode = "200", description = "Bank account updated", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankAccountResponse.class)))
    @APIResponse(responseCode = "400", description = "Invalid input")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Bank account not found")
    public BankAccountResponse updateBankAccount(
            @PathParam("id") @Parameter(description = "Bank account ID") Long id,
            @Valid BankAccountUpdateRequest request) {
        BankAccount account = bankAccountService.update(id, request);
        LOG.info("Bank account updated: id={}", account.getId());
        return BankAccountResponse.from(account);
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Archive a bank account", description = "Soft-deletes the account (sets archived=true). Imports and transactions are preserved. Use POST /restore to undo.")
    @APIResponse(responseCode = "204", description = "Bank account archived")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Bank account not found")
    public void archiveBankAccount(
            @PathParam("id") @Parameter(description = "Bank account ID") Long id) {
        bankAccountService.archive(id);
        LOG.info("Bank account archived: id={}", id);
    }

    @POST
    @Path("/{id}/restore")
    @Operation(summary = "Restore an archived bank account", description = "Sets archived=false on a previously archived account.")
    @APIResponse(responseCode = "200", description = "Bank account restored", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankAccountResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Bank account not found")
    public BankAccountResponse restoreBankAccount(
            @PathParam("id") @Parameter(description = "Bank account ID") Long id) {
        BankAccount account = bankAccountService.restore(id);
        LOG.info("Bank account restored: id={}", id);
        return BankAccountResponse.from(account);
    }
}
