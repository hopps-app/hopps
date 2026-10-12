package app.hopps.document.service;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.category.service.CategoryGroupService;
import app.hopps.document.api.dto.DocumentTransactionPartRequest;
import app.hopps.document.audit.DocumentAuditor;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentDirection;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.document.domain.TradeParty;
import app.hopps.organization.domain.Organization;
import app.hopps.transaction.audit.TransactionAuditor;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionChangedEvent;
import app.hopps.transaction.domain.TransactionDeletedEvent;
import app.hopps.transaction.domain.TransactionStatus;
import app.hopps.transaction.repository.TransactionRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.core.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Creates and maintains the transactions booked from a document. A document normally yields one transaction; it can
 * also be <em>split</em> into several parts (one per bommel/category combination), each a transaction of its own that
 * is reconciled with bank movements and confirmed independently.
 * <p>
 * The split is applied as an upsert so transaction ids (and with them bank links, audit history and deep links) stay
 * stable: listed parts with an id are updated in place, parts without an id are created, and transactions of the
 * document that are no longer listed are deleted. Confirmed transactions are never touched this way.
 */
@ApplicationScoped
public class DocumentTransactionService {

    private static final Logger LOG = LoggerFactory.getLogger(DocumentTransactionService.class);

    @Inject
    TransactionRepository transactionRepository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    CategoryGroupService categoryGroupService;

    @Inject
    TransactionAuditor transactionAuditor;

    @Inject
    DocumentAuditor documentAuditor;

    @Inject
    TradePartyService tradePartyService;

    @Inject
    Event<TransactionDeletedEvent> transactionDeletedEvent;

    @Inject
    Event<TransactionChangedEvent> transactionChangedEvent;

    /**
     * Creates the single DRAFT transaction that mirrors the document (name, signed total, tax, date, bommel,
     * counterparty) and links it. This is the classic "confirm" path and deliberately lenient: a document without an
     * amount or bommel still yields a transaction, the user completes it afterwards. Category values are not touched;
     * the caller applies them.
     */
    public Transaction createFromDocument(Document document, String principal) {
        initialiseLink(document);
        Transaction transaction = newPart(document, principal);
        transaction.setName(document.getName());
        transaction.setTotal(signed(document, document.getTotal()));
        transaction.setTotalTax(document.getTotalTax());
        transaction.setBommel(document.getBommel());
        // The document's sender is the counterparty; the entity places it on the side matching the direction and
        // records the organization on the other side.
        transaction.setCounterparty(document.getSender());
        transactionRepository.persist(transaction);
        transactionAuditor.created(transaction);
        document.getTransactions().add(transaction);
        return transaction;
    }

    /**
     * Replaces the set of transactions booked from the document with the given parts (upsert, see class comment) and
     * returns them in part order.
     * <p>
     * Always enforced: at least one part, every amount greater than zero, bommels belong to the organization, category
     * values are allowed for their group (invalid → 400), and no confirmed transaction is changed or removed (→ 409).
     * <p>
     * With {@code finalize} the document is marked as confirmed; this additionally requires every part to carry a
     * bommel and all mandatory category groups of that bommel, and the parts' amounts must not exceed the document
     * total. Parts may add up to <em>less</em> than the total: a receipt can contain a private share that is not
     * booked. Without {@code finalize} the parts are a draft and the document stays (or returns to) review.
     */
    public List<Transaction> replaceParts(Document document, List<DocumentTransactionPartRequest> parts,
            boolean finalize, String principal) {
        if (parts == null || parts.isEmpty()) {
            throw new BadRequestException("At least one part is required");
        }
        initialiseLink(document);
        Organization organization = document.getOrganization();

        List<Transaction> existing = transactionRepository.findAllByDocumentId(document.getId());
        Map<Long, Transaction> existingById = new HashMap<>();
        existing.forEach(t -> existingById.put(t.getId(), t));

        // Validate the structure before anything is changed, so a bad request leaves the document untouched.
        Set<Long> listed = new HashSet<>();
        for (int i = 0; i < parts.size(); i++) {
            DocumentTransactionPartRequest part = parts.get(i);
            String label = "Part " + (i + 1);
            if (part.amount() == null || part.amount().signum() <= 0) {
                throw new BadRequestException(label + ": amount must be greater than zero");
            }
            if (part.id() != null) {
                Transaction current = existingById.get(part.id());
                if (current == null) {
                    throw new BadRequestException(
                            label + ": transaction " + part.id() + " is not a transaction of this document");
                }
                if (!listed.add(part.id())) {
                    throw new BadRequestException(label + ": transaction " + part.id() + " is listed twice");
                }
                if (current.isConfirmed()) {
                    throw new ClientErrorException(
                            "Transaction " + part.id() + " is confirmed and cannot be changed by splitting",
                            Response.Status.CONFLICT);
                }
            }
        }
        for (Transaction current : existing) {
            if (!listed.contains(current.getId()) && current.isConfirmed()) {
                throw new ClientErrorException(
                        "Transaction " + current.getId() + " is confirmed and cannot be removed by splitting",
                        Response.Status.CONFLICT);
            }
        }

        // Drop the parts that are no longer listed.
        for (Transaction current : existing) {
            if (!listed.contains(current.getId())) {
                deletePart(document, current);
            }
        }

        // Update the listed parts in place and create the new ones.
        List<Transaction> result = new ArrayList<>();
        for (int i = 0; i < parts.size(); i++) {
            DocumentTransactionPartRequest part = parts.get(i);
            boolean isNew = part.id() == null;
            Transaction transaction = isNew ? newPart(document, principal) : existingById.get(part.id());
            Map<String, Object> before = isNew ? null : transactionAuditor.snapshot(transaction);
            BigDecimal previousTotal = transaction.getTotal();

            applyPart(document, organization, transaction, part, i, parts.size());

            if (isNew) {
                transactionRepository.persist(transaction);
                transactionAuditor.created(transaction);
                document.getTransactions().add(transaction);
            } else {
                transactionAuditor.updated(transaction, before);
                if (totalChanged(previousTotal, transaction.getTotal())) {
                    // Refresh the bank-match snapshot so a partially covered movement does not stay FULLY_MATCHED.
                    transactionChangedEvent.fire(new TransactionChangedEvent(transaction.getId()));
                }
            }
            result.add(transaction);
        }
        // Part order is id order ("Teil 1" is the oldest), independent of the order in the request.
        result.sort(Comparator.comparing(Transaction::getId));

        DocumentStatus previousStatus = document.getDocumentStatus();
        if (finalize) {
            requireComplete(document, result);
            document.setReviewedBy(principal);
            if (previousStatus != DocumentStatus.CONFIRMED) {
                document.setDocumentStatus(DocumentStatus.CONFIRMED);
                documentAuditor.confirmed(document, previousStatus);
            }
        } else if (previousStatus == DocumentStatus.CONFIRMED) {
            // Saving a draft of a confirmed document sends it back to review (the split is being reworked).
            document.setDocumentStatus(DocumentStatus.ANALYZED);
            document.setReviewedBy(null);
            documentAuditor.reopened(document, previousStatus);
        }

        LOG.info("Document transactions replaced: documentId={}, parts={}, finalize={}", document.getId(),
                result.size(), finalize);
        return result;
    }

    /** Copies the document's header data and the part's own fields onto the transaction. */
    private void applyPart(Document document, Organization organization, Transaction transaction,
            DocumentTransactionPartRequest part, int index, int count) {
        transaction.setName(nameOf(part, document, index, count));
        transaction.setTotal(signed(document, part.amount()));
        // Tax is only known for the receipt as a whole; it cannot be attributed to a single part.
        transaction.setTotalTax(count == 1 ? document.getTotalTax() : null);
        transaction.setCurrencyCode(document.getCurrencyCode());
        transaction.setTransactionTime(document.getTransactionTime());
        transaction.setPrivatelyPaid(document.isPrivatelyPaid());
        transaction.setBommel(resolveBommel(part.bommelId(), organization));
        syncCounterparty(transaction, document);
        // Null clears: the split always sends the full set of values per part. Values of groups that do not apply to
        // the bommel are discarded by the service; an invalid value rejects the whole request.
        categoryGroupService.validateAndApply(transaction, part.categoryValues() != null ? part.categoryValues()
                : Map.of());
    }

    /**
     * Keeps the counterparty in step with the document's sender. {@code setCounterparty} creates a fresh party for the
     * organization side, so it is only invoked when the counterparty (or, after a direction change, its side) actually
     * differs; the party it displaces is dropped once nothing references it any more.
     */
    private void syncCounterparty(Transaction transaction, Document document) {
        TradeParty counterparty = document.getSender();
        if (transaction.getCounterparty() == counterparty && transaction.getId() != null) {
            return;
        }
        TradeParty previousSender = transaction.getSender();
        TradeParty previousRecipient = transaction.getRecipient();
        transaction.setCounterparty(counterparty);
        if (transaction.getId() != null) {
            for (TradeParty previous : List.of(previousSender, previousRecipient)) {
                if (previous != transaction.getSender() && previous != transaction.getRecipient()) {
                    tradePartyService.deleteIfUnreferenced(previous);
                }
            }
        }
    }

    private void deletePart(Document document, Transaction transaction) {
        // Bank matches are removed (and the bank transaction status recomputed) by the observers before the row goes.
        transactionDeletedEvent.fire(new TransactionDeletedEvent(transaction.getId()));
        TradeParty sender = transaction.getSender();
        TradeParty recipient = transaction.getRecipient();
        document.getTransactions().remove(transaction);
        transactionRepository.delete(transaction);
        // Trade parties are shared with the document, so they are not cascaded.
        tradePartyService.deleteIfUnreferenced(sender);
        tradePartyService.deleteIfUnreferenced(recipient);
        LOG.info("Split part deleted: transactionId={}, documentId={}", transaction.getId(), document.getId());
    }

    /** The checks that only apply when the split is finalized. All violations are reported together. */
    private void requireComplete(Document document, List<Transaction> parts) {
        List<String> problems = new ArrayList<>();
        if (document.getTotal() == null) {
            problems.add("document has no total");
        } else {
            BigDecimal sum = parts.stream().map(t -> t.getTotal().abs()).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (sum.compareTo(document.getTotal().abs()) > 0) {
                problems.add("parts exceed the document total by " + sum.subtract(document.getTotal().abs()));
            }
        }
        for (int i = 0; i < parts.size(); i++) {
            Transaction part = parts.get(i);
            String label = "part " + (i + 1) + ": ";
            if (part.getBommel() == null) {
                problems.add(label + "bommel");
            }
            for (String group : categoryGroupService.missingRequiredGroups(part)) {
                problems.add(label + "categoryGroup:" + group);
            }
        }
        if (!problems.isEmpty()) {
            throw new BadRequestException("Split is not complete: " + String.join(", ", problems));
        }
    }

    private Transaction newPart(Document document, String principal) {
        Transaction transaction = new Transaction();
        transaction.setOrganization(document.getOrganization());
        transaction.setDocument(document);
        transaction.setCreatedBy(principal);
        transaction.setStatus(TransactionStatus.DRAFT);
        transaction.setCurrencyCode(document.getCurrencyCode());
        transaction.setTransactionTime(document.getTransactionTime());
        transaction.setPrivatelyPaid(document.isPrivatelyPaid());
        return transaction;
    }

    private Bommel resolveBommel(Long bommelId, Organization organization) {
        if (bommelId == null) {
            return null;
        }
        Bommel bommel = bommelRepository.findById(bommelId);
        if (bommel == null || !bommelRepository.getOrganization(bommel).getId().equals(organization.getId())) {
            throw new BadRequestException("Bommel " + bommelId + " not found");
        }
        return bommel;
    }

    private static String nameOf(DocumentTransactionPartRequest part, Document document, int index, int count) {
        if (part.name() != null && !part.name().isBlank()) {
            return part.name().trim();
        }
        if (count == 1 && document.getName() != null && !document.getName().isBlank()) {
            return document.getName();
        }
        return "Teil " + (index + 1);
    }

    /**
     * Signs an unsigned amount by the document direction: INCOMING (Eingangsbeleg) is an expense and negative, OUTGOING
     * (Ausgangsbeleg) is income and positive. Null stays null.
     */
    private static BigDecimal signed(Document document, BigDecimal amount) {
        if (amount == null) {
            return null;
        }
        boolean outgoing = document.getDirection() == DocumentDirection.OUTGOING;
        return outgoing ? amount.abs() : amount.abs().negate();
    }

    private static boolean totalChanged(BigDecimal previous, BigDecimal current) {
        if (previous == null || current == null) {
            return previous != current;
        }
        return previous.compareTo(current) != 0;
    }

    /**
     * Loads the inverse-side collection before parts are added or removed. An uninitialised lazy collection would queue
     * the add and replay it on top of a later load, which could list a freshly created part twice.
     */
    private static void initialiseLink(Document document) {
        document.getTransactions().size();
    }
}
