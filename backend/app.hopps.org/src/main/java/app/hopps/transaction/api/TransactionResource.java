package app.hopps.transaction.api;

import app.hopps.bankimport.service.BankTransactionMatchService;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.document.domain.TradeParty;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import app.hopps.transaction.api.dto.TransactionCreateRequest;
import app.hopps.transaction.api.dto.TransactionResponse;
import app.hopps.transaction.api.dto.TransactionUpdateRequest;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionChangedEvent;
import app.hopps.transaction.domain.TransactionDeletedEvent;
import app.hopps.transaction.domain.TransactionStatus;
import app.hopps.transaction.repository.TransactionRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * REST API for transaction management.
 */
@Authenticated
@Path("/transactions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TransactionResource {

    private static final Logger LOG = LoggerFactory.getLogger(TransactionResource.class);

    @Inject
    TransactionRepository transactionRepository;

    @Inject
    OrganizationContext organizationContext;

    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    TransactionCreateConverter createConverter;

    @Inject
    TransactionUpdateConverter updateConverter;

    @Inject
    Event<TransactionDeletedEvent> transactionDeletedEvent;

    @Inject
    Event<TransactionChangedEvent> transactionChangedEvent;

    @Inject
    BankTransactionMatchService bankTransactionMatchService;

    @GET
    @Operation(summary = "List all transactions", description = "Returns all transactions for the current organization with optional filters")
    @APIResponse(responseCode = "200", description = "List of transactions", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TransactionResponse[].class)))
    public List<TransactionResponse> listTransactions(
            @QueryParam("search") @Parameter(description = "Search in name and sender name") String search,
            @QueryParam("startDate") @Parameter(description = "Filter transactions from this date (ISO format: YYYY-MM-DD)") String startDate,
            @QueryParam("endDate") @Parameter(description = "Filter transactions until this date (ISO format: YYYY-MM-DD)") String endDate,
            @QueryParam("bommelId") @Parameter(description = "Filter by bommel ID") Long bommelId,
            @QueryParam("status") @Parameter(description = "Filter by status (DRAFT or CONFIRMED)") TransactionStatus status,
            @QueryParam("privatelyPaid") @Parameter(description = "Filter by privately paid flag") Boolean privatelyPaid,
            @QueryParam("detached") @Parameter(description = "Filter unassigned transactions (no bommel)") Boolean detached,
            @QueryParam("sortBy") @DefaultValue("createdAt") @Parameter(description = "Field to sort by: createdAt, updatedAt, transactionTime or total") String sortBy,
            @QueryParam("sortDir") @DefaultValue("desc") @Parameter(description = "Sort direction: asc or desc") String sortDir,
            @QueryParam("page") @DefaultValue("0") @Parameter(description = "Page index (0-based)") int pageIndex,
            @QueryParam("size") @DefaultValue("25") @Parameter(description = "Page size") int pageSize) {

        Page page = new Page(pageIndex, pageSize);
        Sort sort = buildSort(sortBy, sortDir);

        // Parse dates
        Instant startInstant = null;
        Instant endInstant = null;
        if (startDate != null && !startDate.isBlank()) {
            startInstant = LocalDate.parse(startDate).atStartOfDay(ZoneOffset.UTC).toInstant();
        }
        if (endDate != null && !endDate.isBlank()) {
            // End of day for inclusive range
            endInstant = LocalDate.parse(endDate).plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        }

        List<Transaction> transactions = transactionRepository.findFiltered(
                search,
                startInstant,
                endInstant,
                bommelId,
                status,
                privatelyPaid,
                detached,
                sort,
                page);

        // Batch the bank coverage for the whole page in a single grouped query (avoids N+1) so each row can show how
        // much of its amount still needs to be reconciled with bank movements.
        List<Long> ids = transactions.stream().map(Transaction::getId).toList();
        Map<Long, BigDecimal> covered = bankTransactionMatchService.getCoveredAmountsForTransactions(ids);
        return transactions.stream()
                .map(tx -> TransactionResponse.from(tx, covered.getOrDefault(tx.getId(), BigDecimal.ZERO)))
                .toList();
    }

    /**
     * Builds a Panache Sort from user input, whitelisting sortable columns to prevent invalid/unsafe JPQL.
     */
    private static Sort buildSort(String sortBy, String sortDir) {
        String column = switch (sortBy == null ? "" : sortBy) {
            case "updatedAt" -> "updatedAt";
            case "transactionTime" -> "transactionTime";
            case "total" -> "total";
            default -> "createdAt";
        };
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.Ascending
                : Sort.Direction.Descending;
        return Sort.by(column, direction);
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a transaction", description = "Returns a transaction by ID")
    @APIResponse(responseCode = "200", description = "Transaction found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TransactionResponse.class)))
    @APIResponse(responseCode = "404", description = "Transaction not found")
    public TransactionResponse getTransaction(
            @PathParam("id") @Parameter(description = "Transaction ID") Long id) {
        Transaction transaction = transactionRepository.findByIdScoped(id);
        if (transaction == null) {
            throw new NotFoundException("Transaction not found");
        }
        return TransactionResponse.from(transaction,
                bankTransactionMatchService.getCoveredAmountForTransaction(transaction.getId()));
    }

    @POST
    @Transactional
    @Operation(summary = "Create a manual transaction", description = "Creates a transaction without a document (manual entry)")
    @APIResponse(responseCode = "201", description = "Transaction created", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TransactionResponse.class)))
    @APIResponse(responseCode = "400", description = "Invalid input")
    public Response createTransaction(@Valid TransactionCreateRequest request) {
        Organization organization = organizationContext.getCurrentOrganization();
        if (organization == null) {
            throw new BadRequestException("User is not part of an organization");
        }

        Transaction transaction = new Transaction();
        transaction.setOrganization(organization);
        transaction.setCreatedBy(securityIdentity.getPrincipal().getName());
        transaction.setStatus(TransactionStatus.DRAFT);

        // Apply request fields
        createConverter.applyRequestToTransaction(transaction, request, organization);

        // Flush so the @CreationTimestamp/@UpdateTimestamp values are populated before building the response.
        transactionRepository.persistAndFlush(transaction);
        LOG.info("Transaction created: id={}", transaction.getId());

        return Response.status(Response.Status.CREATED)
                .entity(TransactionResponse.from(transaction,
                        bankTransactionMatchService.getCoveredAmountForTransaction(transaction.getId())))
                .build();
    }

    @PATCH
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Update a transaction", description = "Updates a transaction with user-provided data")
    @APIResponse(responseCode = "200", description = "Transaction updated", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TransactionResponse.class)))
    @APIResponse(responseCode = "404", description = "Transaction not found")
    public TransactionResponse updateTransaction(
            @PathParam("id") @Parameter(description = "Transaction ID") Long id,
            TransactionUpdateRequest request) {
        Transaction transaction = transactionRepository.findByIdScoped(id);
        if (transaction == null) {
            throw new NotFoundException("Transaction not found");
        }

        BigDecimal previousTotal = transaction.getTotal();
        updateConverter.applyUpdateRequestToTransaction(transaction, request);

        // If the amount changed, refresh any bank-transaction match snapshot so a partially covered bank transaction
        // no longer stays FULLY_MATCHED (and the still-open amount reappears in the list).
        if (totalChanged(previousTotal, transaction.getTotal())) {
            transactionChangedEvent.fire(new TransactionChangedEvent(transaction.getId()));
        }

        LOG.info("Transaction updated: id={}", transaction.getId());
        return TransactionResponse.from(transaction,
                bankTransactionMatchService.getCoveredAmountForTransaction(transaction.getId()));
    }

    /**
     * Compares two amounts by value (ignoring scale so e.g. {@code 10.0} equals {@code 10.00}) and treating null as "no
     * amount". Returns true when the amount effectively changed.
     */
    private static boolean totalChanged(BigDecimal previous, BigDecimal current) {
        if (previous == null || current == null) {
            return previous != current;
        }
        return previous.compareTo(current) != 0;
    }

    @POST
    @Path("/{id}/confirm")
    @Transactional
    @Operation(summary = "Confirm a transaction", description = "Marks a transaction as confirmed. Only permitted when the mandatory fields (amount, date, counterparty, name, bommel) are set and the amount is exactly covered by linked bank transactions.")
    @APIResponse(responseCode = "200", description = "Transaction confirmed", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TransactionResponse.class)))
    @APIResponse(responseCode = "400", description = "Transaction is not ready to be confirmed (missing fields or amount not covered by bank transactions)")
    @APIResponse(responseCode = "404", description = "Transaction not found")
    public TransactionResponse confirmTransaction(
            @PathParam("id") @Parameter(description = "Transaction ID") Long id) {
        Transaction transaction = transactionRepository.findByIdScoped(id);
        if (transaction == null) {
            throw new NotFoundException("Transaction not found");
        }

        // Guard: a transaction may only be confirmed when it is complete and fully backed by bank transactions.
        // The UI greys out the confirm button under the same conditions; this is the server-side enforcement.
        if (transaction.getStatus() != TransactionStatus.CONFIRMED) {
            List<String> missing = collectConfirmBlockers(transaction);
            if (!missing.isEmpty()) {
                throw new BadRequestException(
                        "Transaction cannot be confirmed, still missing/invalid: " + String.join(", ", missing));
            }
        }

        transaction.setStatus(TransactionStatus.CONFIRMED);

        // Keep the linked receipt (Beleg) in sync: confirming the bookkeeping transaction also confirms its document,
        // so it no longer lingers in the "needs manual review" state.
        Document document = transaction.getDocument();
        if (document != null) {
            document.setDocumentStatus(DocumentStatus.CONFIRMED);
        }

        LOG.info("Transaction confirmed: id={}", transaction.getId());

        return TransactionResponse.from(transaction,
                bankTransactionMatchService.getCoveredAmountForTransaction(transaction.getId()));
    }

    /**
     * Collects the reasons a transaction cannot yet be confirmed. Empty list means it is ready. The mandatory fields
     * mirror the frontend gate: amount, date, counterparty, name and bommel must be set, and the amount must be exactly
     * covered by the linked bank transactions (sum of their absolute amounts equals the transaction amount).
     */
    private List<String> collectConfirmBlockers(Transaction transaction) {
        List<String> missing = new ArrayList<>();

        BigDecimal total = transaction.getTotal();
        boolean hasAmount = total != null && total.compareTo(BigDecimal.ZERO) != 0;
        if (!hasAmount) {
            missing.add("amount");
        }
        if (transaction.getTransactionTime() == null) {
            missing.add("date");
        }
        TradeParty counterparty = transaction.getCounterparty();
        if (counterparty == null || counterparty.getName() == null || counterparty.getName().isBlank()) {
            missing.add("counterparty");
        }
        if (transaction.getName() == null || transaction.getName().isBlank()) {
            missing.add("name");
        }
        // A Bommel is not required to save a draft, but it must be assigned before the transaction can be confirmed:
        // the confirmation is what books the amount against an organizational unit.
        if (transaction.getBommel() == null) {
            missing.add("bommel");
        }

        if (hasAmount) {
            // Coverage is signed: the linked movements must net to exactly the transaction's signed total (an expense
            // movement does not cover an income transaction, and vice versa).
            BigDecimal covered = bankTransactionMatchService.getCoveredAmountForTransaction(transaction.getId());
            if (covered.compareTo(total) != 0) {
                missing.add("bankCoverage");
            }
        }

        return missing;
    }

    @POST
    @Path("/{id}/reopen")
    @Transactional
    @Operation(summary = "Reopen a transaction", description = "Reverts a confirmed transaction back to draft status")
    @APIResponse(responseCode = "200", description = "Transaction reopened", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TransactionResponse.class)))
    @APIResponse(responseCode = "404", description = "Transaction not found")
    public TransactionResponse reopenTransaction(
            @PathParam("id") @Parameter(description = "Transaction ID") Long id) {
        Transaction transaction = transactionRepository.findByIdScoped(id);
        if (transaction == null) {
            throw new NotFoundException("Transaction not found");
        }

        transaction.setStatus(TransactionStatus.DRAFT);

        // Mirror the document back to a reviewable state so it isn't shown as confirmed while its transaction is a
        // draft.
        Document document = transaction.getDocument();
        if (document != null && document.getDocumentStatus() == DocumentStatus.CONFIRMED) {
            document.setDocumentStatus(DocumentStatus.ANALYZED);
        }

        LOG.info("Transaction reopened: id={}", transaction.getId());

        return TransactionResponse.from(transaction,
                bankTransactionMatchService.getCoveredAmountForTransaction(transaction.getId()));
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Delete a transaction", description = "Deletes a transaction")
    @APIResponse(responseCode = "204", description = "Transaction deleted")
    @APIResponse(responseCode = "404", description = "Transaction not found")
    public void deleteTransaction(
            @PathParam("id") @Parameter(description = "Transaction ID") Long id) {
        Transaction transaction = transactionRepository.findByIdScoped(id);
        if (transaction == null) {
            throw new NotFoundException("Transaction not found");
        }

        // Clean up any bank-transaction matches (and recompute their status) before the row is removed.
        transactionDeletedEvent.fire(new TransactionDeletedEvent(transaction.getId()));

        transactionRepository.delete(transaction);
        LOG.info("Transaction deleted: id={}", id);
    }

}
