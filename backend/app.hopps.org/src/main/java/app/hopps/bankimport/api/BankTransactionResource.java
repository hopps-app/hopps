package app.hopps.bankimport.api;

import app.hopps.bankimport.api.dto.BankTransactionAggregateResponse;
import app.hopps.bankimport.api.dto.BankTransactionResponse;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionStatus;
import app.hopps.bankimport.repository.BankTransactionRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

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

    @GET
    @Operation(summary = "List bank transactions", description = "Cross-account listing scoped to the current org. Filters: accountIds, dateFrom/dateTo, status (multi), search (purpose/counterparty).")
    @APIResponse(responseCode = "200", description = "List of transactions", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankTransactionResponse[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    public List<BankTransactionResponse> list(
            @QueryParam("accountIds") @Parameter(description = "Comma-separated bank account IDs (omit for all accounts)") String accountIdsCsv,
            @QueryParam("dateFrom") @Parameter(description = "Booking date inclusive (ISO-8601)") String dateFrom,
            @QueryParam("dateTo") @Parameter(description = "Booking date inclusive (ISO-8601)") String dateTo,
            @QueryParam("status") @Parameter(description = "Comma-separated statuses (UNMATCHED, PARTIALLY_MATCHED, FULLY_MATCHED, IGNORED)") String statusesCsv,
            @QueryParam("search") @Parameter(description = "Substring match on purpose / counterparty name") String search,
            @QueryParam("page") @DefaultValue("0") @Parameter(description = "Page index (0-based)") int pageIndex,
            @QueryParam("size") @DefaultValue("50") @Parameter(description = "Page size") int pageSize) {
        List<Long> accountIds = parseLongList(accountIdsCsv);
        List<BankTransactionStatus> statuses = parseStatusList(statusesCsv);
        LocalDate from = parseDate(dateFrom);
        LocalDate to = parseDate(dateTo);

        List<BankTransaction> rows = transactionRepository.findFiltered(
                accountIds, from, to, statuses, search, new Page(pageIndex, pageSize));
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
            @QueryParam("search") String search) {
        List<Long> accountIds = parseLongList(accountIdsCsv);
        List<BankTransactionStatus> statuses = parseStatusList(statusesCsv);
        LocalDate from = parseDate(dateFrom);
        LocalDate to = parseDate(dateTo);
        BigDecimal[] aggr = transactionRepository.aggregate(accountIds, from, to, statuses, search);
        BigDecimal incoming = aggr[0];
        BigDecimal outgoing = aggr[1];
        // count uses the filtered list size — for MVP we re-run a paged query with a high cap. Keep simple.
        long count = transactionRepository.findFiltered(
                accountIds, from, to, statuses, search, new Page(0, Integer.MAX_VALUE)).size();
        return new BankTransactionAggregateResponse(incoming, outgoing, incoming.add(outgoing), count);
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a bank transaction", description = "Returns a bank transaction by ID")
    @APIResponse(responseCode = "200", description = "Transaction found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BankTransactionResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Transaction not found")
    public BankTransactionResponse get(
            @PathParam("id") @Parameter(description = "Bank transaction ID") Long id) {
        BankTransaction tx = transactionRepository.findByIdScoped(id);
        if (tx == null) {
            throw new NotFoundException("Bank transaction not found");
        }
        return BankTransactionResponse.from(tx);
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
            @QueryParam("page") @DefaultValue("0") int pageIndex,
            @QueryParam("size") @DefaultValue("50") int pageSize) {
        List<BankTransactionStatus> statuses = parseStatusList(statusesCsv);
        LocalDate from = parseDate(dateFrom);
        LocalDate to = parseDate(dateTo);
        List<BankTransaction> rows = transactionRepository.findFiltered(
                List.of(accountId), from, to, statuses, search, new Page(pageIndex, pageSize));
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
}
