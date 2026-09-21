package app.hopps.transaction.audit;

import app.hopps.audit.domain.AuditAction;
import app.hopps.audit.domain.AuditEntityType;
import app.hopps.audit.service.AuditDiff;
import app.hopps.audit.service.AuditService;
import app.hopps.audit.service.EntityAuditor;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionDeletedEvent;
import app.hopps.transaction.domain.TransactionStatus;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Audit of transactions: creating, changing, confirming, reopening, linking to bank transactions and deleting. Links to
 * bank transactions are recorded on the transaction they belong to, so its history is a single query.
 */
@ApplicationScoped
public class TransactionAuditor implements EntityAuditor<Transaction> {

    @Inject
    AuditService audit;

    @Inject
    EntityManager em;

    @Override
    public AuditEntityType entityType() {
        return AuditEntityType.TRANSACTION;
    }

    @Override
    public Long entityId(Transaction tx) {
        return tx.getId();
    }

    @Override
    public Long organizationId(Transaction tx) {
        return tx.getOrganization() == null ? null : tx.getOrganization().getId();
    }

    @Override
    public Map<String, Object> snapshot(Transaction tx) {
        return TransactionSnapshot.of(tx);
    }

    public void created(Transaction tx) {
        audit.created(this, tx);
    }

    /** Records the fields that differ from {@code before}; nothing is written when none does. */
    public void updated(Transaction tx, Map<String, Object> before) {
        audit.updated(this, tx, before);
    }

    /** Records a confirm or reopen; nothing is written when the status did not change. */
    public void statusChanged(Transaction tx, TransactionStatus before, AuditAction action) {
        if (before == tx.getStatus()) {
            return;
        }
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("status", AuditDiff.change(name(before), name(tx.getStatus())));
        audit.record(entityType(), organizationId(tx), tx.getId(), action, changes, null);
    }

    /**
     * Records that a bank transaction was linked. {@code adoptedTotal} is set when the link gave a transaction without
     * an amount the amount of the bank transaction.
     */
    public void linked(Transaction tx, Long bankTransactionId, BigDecimal allocation, boolean manual,
            boolean adoptedTotal) {
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("bankTransactionId", bankTransactionId);
        changes.put("matchedAmount", TransactionSnapshot.amount(allocation));
        changes.put("amountManual", manual);
        if (adoptedTotal) {
            changes.put("total", AuditDiff.change(null, TransactionSnapshot.amount(tx.getTotal())));
        }
        audit.record(entityType(), organizationId(tx), tx.getId(), AuditAction.LINK, changes, null);
    }

    public void unlinked(Long organizationId, Long transactionId, Long bankTransactionId, BigDecimal matchedAmount) {
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("bankTransactionId", bankTransactionId);
        changes.put("matchedAmount", TransactionSnapshot.amount(matchedAmount));
        audit.record(entityType(), organizationId, transactionId, AuditAction.UNLINK, changes, null);
    }

    public void allocationChanged(Long organizationId, Long transactionId, Long bankTransactionId,
            BigDecimal oldAmount, BigDecimal newAmount) {
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("bankTransactionId", bankTransactionId);
        changes.put("matchedAmount",
                AuditDiff.change(TransactionSnapshot.amount(oldAmount), TransactionSnapshot.amount(newAmount)));
        audit.record(entityType(), organizationId, transactionId, AuditAction.ALLOCATION_UPDATE, changes, null);
    }

    /**
     * Records a deletion with the full state, including the bank transactions that were linked. Every delete path fires
     * {@link TransactionDeletedEvent} before the row goes. This runs before the observer that removes those links
     * (default priority), so they can still be read.
     */
    void onTransactionDeleted(@Observes @Priority(1000) TransactionDeletedEvent event) {
        Transaction tx = em.find(Transaction.class, event.transactionId());
        if (tx == null) {
            return;
        }

        List<Object[]> rows = em.createQuery(
                "SELECT m.bankTransaction.id, m.matchedAmount FROM BankTransactionMatch m WHERE m.transaction.id = :txId ORDER BY m.id",
                Object[].class)
                .setParameter("txId", tx.getId())
                .getResultList();
        List<Object> bankMatches = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> match = new LinkedHashMap<>();
            match.put("bankTransactionId", row[0]);
            match.put("matchedAmount", TransactionSnapshot.amount((BigDecimal) row[1]));
            bankMatches.add(match);
        }

        Map<String, Object> snapshot = TransactionSnapshot.of(tx);
        snapshot.put("bankMatches", bankMatches);
        audit.deleted(this, tx, snapshot);
    }

    private static String name(TransactionStatus status) {
        return status == null ? null : status.name();
    }
}
