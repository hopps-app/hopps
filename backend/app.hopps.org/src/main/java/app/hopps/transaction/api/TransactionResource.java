package app.hopps.transaction.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.category.domain.Category;
import app.hopps.category.repository.CategoryRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import app.hopps.transaction.api.dto.TransactionCreateRequest;
import app.hopps.transaction.api.dto.TransactionResponse;
import app.hopps.transaction.api.dto.TransactionUpdateRequest;
import app.hopps.transaction.domain.TradeParty;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionArea;
import app.hopps.transaction.domain.TransactionStatus;
import app.hopps.transaction.repository.TransactionRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
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
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashSet;
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
    BommelRepository bommelRepository;

    @Inject
    CategoryRepository categoryRepository;

    @Inject
    OrganizationContext organizationContext;

    @Inject
    SecurityIdentity securityIdentity;

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
            @QueryParam("page") @DefaultValue("0") @Parameter(description = "Page index (0-based)") int pageIndex,
            @QueryParam("size") @DefaultValue("25") @Parameter(description = "Page size") int pageSize) {

        Page page = new Page(pageIndex, pageSize);

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
                page);

        return transactions.stream()
                .map(TransactionResponse::from)
                .toList();
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
        applyRequestToTransaction(transaction, request);

        transactionRepository.persist(transaction);
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

        applyUpdateRequestToTransaction(transaction, request);

        LOG.info("Transaction updated: id={}", transaction.getId());
        return TransactionResponse.from(transaction);
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

        transactionRepository.delete(transaction);
        LOG.info("Transaction deleted: id={}", id);
    }

    // Helper methods

    private void applyRequestToTransaction(Transaction transaction, TransactionCreateRequest request) {
        transaction.setName(request.name());
        transaction.setTotal(request.total());
        transaction.setTotalTax(request.totalTax());
        transaction.setCurrencyCode(request.currencyCode());
        transaction.setPrivatelyPaid(request.privatelyPaid());

        if (request.transactionDate() != null && !request.transactionDate().isBlank()) {
            LocalDate date = LocalDate.parse(request.transactionDate());
            transaction.setTransactionTime(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
        }

        if (request.dueDate() != null && !request.dueDate().isBlank()) {
            LocalDate date = LocalDate.parse(request.dueDate());
            transaction.setDueDate(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
        }

        if (request.bommelId() != null) {
            Bommel bommel = bommelRepository.findById(request.bommelId());
            transaction.setBommel(bommel);
        }

        if (request.categoryId() != null) {
            Category category = categoryRepository.findById(request.categoryId());
            transaction.setCategory(category);
        }

        if (request.area() != null && !request.area().isBlank()) {
            transaction.setArea(TransactionArea.valueOf(request.area().toUpperCase()));
        }

        if (request.senderName() != null && !request.senderName().isBlank()) {
            TradeParty sender = new TradeParty();
            sender.setName(request.senderName());
            sender.setStreet(request.senderStreet());
            sender.setZipCode(request.senderZipCode());
            sender.setCity(request.senderCity());
            transaction.setSender(sender);
        }

        if (request.tags() != null && !request.tags().isEmpty()) {
            transaction.setTags(new HashSet<>(request.tags()));
        }
    }

    private void applyUpdateRequestToTransaction(Transaction transaction, TransactionUpdateRequest request) {
        if (request.name() != null) {
            transaction.setName(request.name());
        }

        if (request.total() != null) {
            transaction.setTotal(request.total());
        }

        if (request.totalTax() != null) {
            transaction.setTotalTax(request.totalTax());
        }

        if (request.currencyCode() != null) {
            transaction.setCurrencyCode(request.currencyCode());
        }

        transaction.setPrivatelyPaid(request.privatelyPaid());

        if (request.transactionDate() != null && !request.transactionDate().isBlank()) {
            LocalDate date = LocalDate.parse(request.transactionDate());
            transaction.setTransactionTime(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
        }

        if (request.dueDate() != null && !request.dueDate().isBlank()) {
            LocalDate date = LocalDate.parse(request.dueDate());
            transaction.setDueDate(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
        }

        if (request.bommelId() != null) {
            if (request.bommelId() > 0) {
                Bommel bommel = bommelRepository.findById(request.bommelId());
                transaction.setBommel(bommel);
            } else {
                transaction.setBommel(null);
            }
        }

        if (request.categoryId() != null) {
            if (request.categoryId() > 0) {
                Category category = categoryRepository.findById(request.categoryId());
                transaction.setCategory(category);
            } else {
                transaction.setCategory(null);
            }
        }

        if (request.area() != null && !request.area().isBlank()) {
            transaction.setArea(TransactionArea.valueOf(request.area().toUpperCase()));
        }

        // Update sender
        if (request.senderName() != null && !request.senderName().isBlank()) {
            TradeParty sender = transaction.getSender();
            if (sender == null) {
                sender = new TradeParty();
                transaction.setSender(sender);
            }
            sender.setName(request.senderName());
            sender.setStreet(request.senderStreet());
            sender.setZipCode(request.senderZipCode());
            sender.setCity(request.senderCity());
        }

        if (request.tags() != null) {
            transaction.setTags(new HashSet<>(request.tags()));
        }
    }
}
