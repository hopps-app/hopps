package app.hopps.bankimport.api;

import app.hopps.bankimport.api.dto.BankTransactionAggregateResponse;
import app.hopps.bankimport.api.dto.BankTransactionResponse;
import app.hopps.bankimport.api.dto.MatchAllocationResponse;
import app.hopps.bankimport.api.dto.MatchAmountRequest;
import app.hopps.bankimport.api.dto.MatchRequest;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionStatus;
import app.hopps.bankimport.repository.BankTransactionRepository;
import app.hopps.bankimport.service.BankTransactionMatchService;
import app.hopps.bankimport.service.BankTransactionReceiptService;
import app.hopps.document.api.dto.DocumentResponse;
import io.quarkus.panache.common.Page;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Read-only cross-account listing & aggregation of bank transactions. The per-account listing reuses the same query
 * with a single accountIds value (see {@link #listForAccount}).
 */
@Authenticated
@Path("/bank-transactions")
@Produces(MediaType.APPLICATION_JSON)
public class BankTransactionResource {

    @Inject
    BankTransactionRepository transactionRepository;

    @Inject
    BankTransactionMatchService matchService;

    @Inject
    BankTransactionReceiptService receiptService;

    @GET
    @Operation(summary = "List bank transactions", description = "Cross-account listing scoped to the current org. Filters: accountIds, dateFrom/dateTo, status (multi), search (purpose/counterparty), minAmount/maxAmount (magnitude range).")
    @APIResponse(responseCode = "200", description = "List of transactions", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankTransactionResponse[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    public List<BankTransactionResponse> list(
            @QueryParam("accountIds") @Parameter(description = "Comma-separated bank account IDs (omit for all accounts)") String accountIdsCsv,
            @QueryParam("dateFrom") @Parameter(description = "Booking date inclusive (ISO-8601)") String dateFrom,
            @QueryParam("dateTo") @Parameter(description = "Booking date inclusive (ISO-8601)") String dateTo,
            @QueryParam("status") @Parameter(description = "Comma-separated statuses (UNMATCHED, PARTIALLY_MATCHED, FULLY_MATCHED, IGNORED)") String statusesCsv,
            @QueryParam("search") @Parameter(description = "Substring match on purpose / counterparty name") String search,
            @QueryParam("minAmount") @Parameter(description = "Minimum transaction amount by magnitude (absolute value, inclusive)") String minAmount,
            @QueryParam("maxAmount") @Parameter(description = "Maximum transaction amount by magnitude (absolute value, inclusive)") String maxAmount,
            @QueryParam("sort") @DefaultValue("bookingDate") @Parameter(description = "Sort field: bookingDate, amount or counterpartyName") String sort,
            @QueryParam("direction") @DefaultValue("desc") @Parameter(description = "Sort direction: asc or desc") String direction,
            @QueryParam("page") @DefaultValue("0") @Parameter(description = "Page index (0-based)") int pageIndex,
            @QueryParam("size") @DefaultValue("50") @Parameter(description = "Page size") int pageSize) {
        List<Long> accountIds = parseLongList(accountIdsCsv);
        List<BankTransactionStatus> statuses = parseStatusList(statusesCsv);
        LocalDate from = parseDate(dateFrom);
        LocalDate to = parseDate(dateTo);

        List<BankTransaction> rows = transactionRepository.findFiltered(
                accountIds, from, to, statuses, search, parseAmount(minAmount), parseAmount(maxAmount), sort,
                isAscending(direction), new Page(pageIndex, pageSize));
        return rows.stream().map(BankTransactionResponse::from).toList();
    }

    @GET
    @Path("/aggregate")
    @Operation(summary = "Aggregate totals", description = "Returns sumIncoming, sumOutgoing, net and count for the same filter set as GET /bank-transactions.")
    @APIResponse(responseCode = "200", description = "Aggregated totals", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankTransactionAggregateResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    public BankTransactionAggregateResponse aggregate(
            @QueryParam("accountIds") String accountIdsCsv,
            @QueryParam("dateFrom") String dateFrom,
            @QueryParam("dateTo") String dateTo,
            @QueryParam("status") String statusesCsv,
            @QueryParam("search") String search,
            @QueryParam("minAmount") @Parameter(description = "Minimum transaction amount by magnitude (absolute value, inclusive)") String minAmount,
            @QueryParam("maxAmount") @Parameter(description = "Maximum transaction amount by magnitude (absolute value, inclusive)") String maxAmount) {
        List<Long> accountIds = parseLongList(accountIdsCsv);
        List<BankTransactionStatus> statuses = parseStatusList(statusesCsv);
        LocalDate from = parseDate(dateFrom);
        LocalDate to = parseDate(dateTo);
        BigDecimal min = parseAmount(minAmount);
        BigDecimal max = parseAmount(maxAmount);
        BigDecimal[] aggr = transactionRepository.aggregate(accountIds, from, to, statuses, search, min, max);
        BigDecimal incoming = aggr[0];
        BigDecimal outgoing = aggr[1];
        long count = transactionRepository.countFiltered(accountIds, from, to, statuses, search, min, max);
        return new BankTransactionAggregateResponse(incoming, outgoing, incoming.add(outgoing), count);
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a bank transaction", description = "Returns a bank transaction by ID, including matched transaction IDs")
    @APIResponse(responseCode = "200", description = "Transaction found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankTransactionResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Transaction not found")
    public BankTransactionResponse get(
            @PathParam("id") @Parameter(description = "Bank transaction ID") Long id) {
        BankTransaction tx = transactionRepository.findByIdScoped(id);
        if (tx == null) {
            throw new NotFoundException("Bank transaction not found");
        }
        List<Long> matchIds = matchService.getMatchedTransactionIds(id);
        return BankTransactionResponse.from(tx, matchIds);
    }

    @POST
    @Path("/{id}/matches")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Link a bank transaction to a hopps transaction", description = "Creates a MANUAL match between the bank transaction and a bookkeeping transaction. Optionally records how much of the bank movement is used for this transaction (the allocation) — omit for the full amount, or set it to split a collective transfer across several transactions.")
    @APIResponse(responseCode = "204", description = "Match created")
    @APIResponse(responseCode = "400", description = "Missing transaction id, invalid allocation amount, or ignored bank transaction")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Bank transaction or transaction not found")
    public Response addMatch(
            @PathParam("id") @Parameter(description = "Bank transaction ID") Long id,
            MatchRequest request,
            @Context SecurityContext securityContext) {
        if (request == null || request.transactionId() == null) {
            throw new BadRequestException("transactionId is required");
        }
        String username = securityContext.getUserPrincipal() != null ? securityContext.getUserPrincipal().getName()
                : "unknown";
        matchService.addMatch(id, request.transactionId(), username, request.amount());
        return Response.noContent().build();
    }

    @PATCH
    @Path("/{id}/matches/{transactionId}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Update the used amount of a match", description = "Sets how much of the bank movement is used for the linked transaction (the allocation). Used to disentangle a collective transfer after the fact.")
    @APIResponse(responseCode = "204", description = "Allocation updated")
    @APIResponse(responseCode = "400", description = "Invalid allocation amount")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Bank transaction or match not found")
    public Response updateMatchAmount(
            @PathParam("id") @Parameter(description = "Bank transaction ID") Long id,
            @PathParam("transactionId") @Parameter(description = "Hopps transaction ID") Long transactionId,
            MatchAmountRequest request) {
        matchService.updateMatchAmount(id, transactionId, request != null ? request.amount() : null);
        return Response.noContent().build();
    }

    @GET
    @Path("/{id}/matches")
    @Operation(summary = "List the matches of a bank transaction", description = "Returns each linked bookkeeping transaction together with the portion of the bank movement allocated to it.")
    @APIResponse(responseCode = "200", description = "List of allocations", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = MatchAllocationResponse[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    public List<MatchAllocationResponse> listMatches(
            @PathParam("id") @Parameter(description = "Bank transaction ID") Long id) {
        return matchService.getAllocationsByTransactionForBankTransaction(id)
                .entrySet()
                .stream()
                .map(e -> new MatchAllocationResponse(e.getKey(), e.getValue()))
                .toList();
    }

    @POST
    @Path("/{id}/receipt")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Operation(summary = "Create a receipt and a linked transaction for a bank transaction", description = "Uploads a receipt document and creates a DRAFT bookkeeping transaction pre-filled from the bank movement (counterparty as trade party, amount and purpose). The document, the transaction and the bank transaction are linked, and the document is analysed by the Document-AI for later review.")
    @APIResponse(responseCode = "201", description = "Receipt uploaded and transaction created", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = DocumentResponse.class)))
    @APIResponse(responseCode = "400", description = "Invalid file or ignored bank transaction")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Bank transaction not found")
    @APIResponse(responseCode = "409", description = "A document with identical file content already exists in the organization")
    public Response createReceipt(
            @PathParam("id") @Parameter(description = "Bank transaction ID") Long id,
            @RestForm("file") FileUpload file,
            @QueryParam("analyze") @DefaultValue("true") @Parameter(description = "Whether to trigger automatic AI analysis of the receipt") boolean analyze,
            @Context SecurityContext securityContext) {
        String username = securityContext.getUserPrincipal() != null ? securityContext.getUserPrincipal().getName()
                : "unknown";
        DocumentResponse response = receiptService.createReceiptForBankTransaction(id, file, analyze, username);
        return Response.status(Response.Status.CREATED).entity(response).build();
    }

    @DELETE
    @Path("/{id}/matches/{transactionId}")
    @Operation(summary = "Unlink a bank transaction from a hopps transaction", description = "Removes a match between the bank transaction and the bookkeeping transaction.")
    @APIResponse(responseCode = "204", description = "Match removed")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Bank transaction or match not found")
    public jakarta.ws.rs.core.Response removeMatch(
            @PathParam("id") @Parameter(description = "Bank transaction ID") Long id,
            @PathParam("transactionId") @Parameter(description = "Hopps transaction ID") Long transactionId) {
        matchService.removeMatch(id, transactionId);
        return jakarta.ws.rs.core.Response.noContent().build();
    }

    @POST
    @Path("/{id}/ignore")
    @Operation(summary = "Mark a bank transaction as ignored", description = "Sets the status to IGNORED — the transaction will not appear in the reconciliation worklist.")
    @APIResponse(responseCode = "204", description = "Transaction marked as ignored")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Bank transaction not found")
    public jakarta.ws.rs.core.Response ignore(
            @PathParam("id") @Parameter(description = "Bank transaction ID") Long id) {
        matchService.setIgnored(id);
        return jakarta.ws.rs.core.Response.noContent().build();
    }

    @DELETE
    @Path("/{id}/ignore")
    @Operation(summary = "Unmark a bank transaction as ignored", description = "Reverts the IGNORED status — recomputes status from existing matches.")
    @APIResponse(responseCode = "204", description = "Transaction unignored")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Bank transaction not found")
    public jakarta.ws.rs.core.Response unignore(
            @PathParam("id") @Parameter(description = "Bank transaction ID") Long id) {
        matchService.unignore(id);
        return jakarta.ws.rs.core.Response.noContent().build();
    }

    @GET
    @Path("/for-transaction/{transactionId}")
    @Operation(summary = "List bank transactions linked to a bookkeeping transaction", description = "Returns the bank transactions matched to the given transaction — the reverse direction of the N:M match mapping, scoped to the current organization.")
    @APIResponse(responseCode = "200", description = "List of linked bank transactions", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankTransactionResponse[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    public List<BankTransactionResponse> listForTransaction(
            @PathParam("transactionId") @Parameter(description = "Bookkeeping transaction ID") Long transactionId) {
        Map<Long, BigDecimal> allocations = matchService.getAllocationsByBankTransactionForTransaction(transactionId);
        return matchService.getBankTransactionsForTransaction(transactionId)
                .stream()
                .map(tx -> BankTransactionResponse.from(tx, matchService.getMatchedTransactionIds(tx.getId()),
                        allocations.get(tx.getId())))
                .toList();
    }

    @GET
    @Path("/by-account/{accountId}")
    @Operation(summary = "List transactions of one account", description = "Convenience endpoint equivalent to GET /bank-transactions?accountIds={accountId} — used by the bank account detail screen.")
    @APIResponse(responseCode = "200", description = "List of transactions", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankTransactionResponse[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    public List<BankTransactionResponse> listForAccount(
            @PathParam("accountId") @Parameter(description = "Bank account ID") Long accountId,
            @QueryParam("dateFrom") String dateFrom,
            @QueryParam("dateTo") String dateTo,
            @QueryParam("status") String statusesCsv,
            @QueryParam("search") String search,
            @QueryParam("minAmount") @Parameter(description = "Minimum transaction amount by magnitude (absolute value, inclusive)") String minAmount,
            @QueryParam("maxAmount") @Parameter(description = "Maximum transaction amount by magnitude (absolute value, inclusive)") String maxAmount,
            @QueryParam("sort") @DefaultValue("bookingDate") @Parameter(description = "Sort field: bookingDate, amount or counterpartyName") String sort,
            @QueryParam("direction") @DefaultValue("desc") @Parameter(description = "Sort direction: asc or desc") String direction,
            @QueryParam("page") @DefaultValue("0") int pageIndex,
            @QueryParam("size") @DefaultValue("50") int pageSize) {
        List<BankTransactionStatus> statuses = parseStatusList(statusesCsv);
        LocalDate from = parseDate(dateFrom);
        LocalDate to = parseDate(dateTo);
        List<BankTransaction> rows = transactionRepository.findFiltered(
                List.of(accountId), from, to, statuses, search, parseAmount(minAmount), parseAmount(maxAmount), sort,
                isAscending(direction), new Page(pageIndex, pageSize));
        return rows.stream().map(BankTransactionResponse::from).toList();
    }

    private static List<Long> parseLongList(String csv) {
        if (csv == null || csv.isBlank()) {
            return null;
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .toList();
    }

    private static List<BankTransactionStatus> parseStatusList(String csv) {
        if (csv == null || csv.isBlank()) {
            return null;
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(BankTransactionStatus::valueOf)
                .toList();
    }

    private static LocalDate parseDate(String value) {
        return (value == null || value.isBlank()) ? null : LocalDate.parse(value);
    }

    /**
     * Parses an amount-range bound. Accepts both comma and dot as decimal separator (the SPA sends a locale-formatted
     * value); blank or non-numeric input is treated as "no bound" ({@code null}) rather than a 400 so a partially typed
     * filter never breaks the listing.
     */
    private static BigDecimal parseAmount(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value.trim().replace(" ", "").replace(",", "."));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Maps the {@code direction} query param to a boolean; anything other than {@code asc} means descending. */
    private static boolean isAscending(String direction) {
        return "asc".equalsIgnoreCase(direction);
    }
}
