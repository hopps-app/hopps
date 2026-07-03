package app.hopps.transaction.api;

import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import app.hopps.transaction.api.dto.TransactionCreateRequest;
import app.hopps.transaction.api.dto.TransactionResponse;
import app.hopps.transaction.api.dto.TransactionUpdateRequest;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionArea;
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
import java.util.List;

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

    @GET
    @Operation(summary = "List all transactions", description = "Returns all transactions for the current organization with optional filters")
    @APIResponse(responseCode = "200", description = "List of transactions", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TransactionResponse[].class)))
    public List<TransactionResponse> listTransactions(
            @QueryParam("search") @Parameter(description = "Search in name and sender name") String search,
            @QueryParam("startDate") @Parameter(description = "Filter transactions from this date (ISO format: YYYY-MM-DD)") String startDate,
            @QueryParam("endDate") @Parameter(description = "Filter transactions until this date (ISO format: YYYY-MM-DD)") String endDate,
            @QueryParam("bommelId") @Parameter(description = "Filter by bommel ID") Long bommelId,
            @QueryParam("categoryId") @Parameter(description = "Filter by category ID") Long categoryId,
            @QueryParam("status") @Parameter(description = "Filter by status (DRAFT or CONFIRMED)") TransactionStatus status,
            @QueryParam("privatelyPaid") @Parameter(description = "Filter by privately paid flag") Boolean privatelyPaid,
            @QueryParam("detached") @Parameter(description = "Filter unassigned transactions (no bommel)") Boolean detached,
            @QueryParam("area") @Parameter(description = "Filter by transaction area (IDEELL, ZWECKBETRIEB, VERMOEGENSVERWALTUNG, WIRTSCHAFTLICH)") TransactionArea area,
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
                categoryId,
                status,
                privatelyPaid,
                detached,
                area,
                sort,
                page);

        return transactions.stream()
                .map(TransactionResponse::from)
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
        return TransactionResponse.from(transaction);
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
                .entity(TransactionResponse.from(transaction))
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
        return TransactionResponse.from(transaction);
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
    @Operation(summary = "Confirm a transaction", description = "Marks a transaction as confirmed")
    @APIResponse(responseCode = "200", description = "Transaction confirmed", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TransactionResponse.class)))
    @APIResponse(responseCode = "404", description = "Transaction not found")
    public TransactionResponse confirmTransaction(
            @PathParam("id") @Parameter(description = "Transaction ID") Long id) {
        Transaction transaction = transactionRepository.findByIdScoped(id);
        if (transaction == null) {
            throw new NotFoundException("Transaction not found");
        }

        transaction.setStatus(TransactionStatus.CONFIRMED);
        LOG.info("Transaction confirmed: id={}", transaction.getId());

        return TransactionResponse.from(transaction);
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
