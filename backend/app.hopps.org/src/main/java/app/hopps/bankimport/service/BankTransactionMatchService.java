package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionMatch;
import app.hopps.bankimport.domain.BankTransactionMatchType;
import app.hopps.bankimport.domain.BankTransactionStatus;
import app.hopps.bankimport.repository.BankTransactionRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import app.hopps.transaction.domain.Transaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;

import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class BankTransactionMatchService {

    @Inject
    BankTransactionRepository bankTransactionRepository;

    @Inject
    EntityManager em;

    @Inject
    OrganizationContext organizationContext;

    @Transactional
    public void addMatch(Long bankTxId, Long transactionId, String username) {
        BankTransaction bankTx = bankTransactionRepository.findByIdScoped(bankTxId);
        if (bankTx == null) {
            throw new NotFoundException("Bank transaction not found");
        }
        if (bankTx.getStatus() == BankTransactionStatus.IGNORED) {
            throw new BadRequestException("Cannot match an ignored bank transaction");
        }

        Transaction tx = em.find(Transaction.class, transactionId);
        if (tx == null) {
            throw new NotFoundException("Transaction not found");
        }

        // When the transaction has no amount yet (e.g. it was cleared because the analysed value was in the wrong
        // currency), adopt the bank transaction's signed euro amount so the booking gets its correct value from the
        // reconciled movement. This also makes the coverage exact (matchedAmount below equals abs(bankTx amount)).
        if (tx.getTotal() == null || tx.getTotal().signum() == 0) {
            tx.setTotal(bankTx.getAmount());
        }

        boolean alreadyLinked = em.createQuery(
                "SELECT COUNT(m) FROM BankTransactionMatch m WHERE m.bankTransaction.id = :bankTxId AND m.transaction.id = :txId",
                Long.class)
                .setParameter("bankTxId", bankTxId)
                .setParameter("txId", transactionId)
                .getSingleResult() > 0;

        if (alreadyLinked) {
            return;
        }

        BankTransactionMatch match = new BankTransactionMatch();
        match.setBankTransaction(bankTx);
        match.setTransaction(tx);
        // matchedAmount is the covered magnitude. Both bank amount and transaction total share the same sign
        // (expense = negative, income = positive), so we compare absolute values in recomputeStatus.
        match.setMatchedAmount(tx.getTotal() != null ? tx.getTotal().abs() : BigDecimal.ZERO);
        match.setMatchType(BankTransactionMatchType.MANUAL);
        match.setMatchedBy(username);
        em.persist(match);

        recomputeStatus(bankTx);
    }

    @Transactional
    public void removeMatch(Long bankTxId, Long transactionId) {
        BankTransaction bankTx = bankTransactionRepository.findByIdScoped(bankTxId);
        if (bankTx == null) {
            throw new NotFoundException("Bank transaction not found");
        }

        int deleted = em.createQuery(
                "DELETE FROM BankTransactionMatch m WHERE m.bankTransaction.id = :bankTxId AND m.transaction.id = :txId")
                .setParameter("bankTxId", bankTxId)
                .setParameter("txId", transactionId)
                .executeUpdate();

        if (deleted == 0) {
            throw new NotFoundException("Match not found");
        }

        recomputeStatus(bankTx);
    }

    /**
     * Removes all matches that reference the given bookkeeping transaction (e.g. because it is being deleted) and
     * recomputes the status of every affected bank transaction. The DB-level {@code on delete cascade} removes the
     * match rows, but it does not refresh the denormalized {@code status}/{@code matchedAmount} on the bank transaction
     * — so without this it would stay stuck in MATCHED state.
     */
    @Transactional
    public void removeMatchesForTransaction(Long transactionId) {
        List<BankTransaction> affected = em.createQuery(
                "SELECT DISTINCT m.bankTransaction FROM BankTransactionMatch m WHERE m.transaction.id = :txId",
                BankTransaction.class)
                .setParameter("txId", transactionId)
                .getResultList();

        if (affected.isEmpty()) {
            return;
        }

        em.createQuery("DELETE FROM BankTransactionMatch m WHERE m.transaction.id = :txId")
                .setParameter("txId", transactionId)
                .executeUpdate();

        for (BankTransaction bankTx : affected) {
            recomputeStatus(bankTx);
        }
    }

    /**
     * Refreshes the {@code matchedAmount} snapshot of every match that references the given bookkeeping transaction to
     * the transaction's current total, then recomputes the status of each affected bank transaction. Needed because the
     * match stores the covered magnitude at match time (see {@link #addMatch}); when the user later edits the
     * transaction amount (e.g. because a receipt only covers part of the bank movement) the snapshot would otherwise go
     * stale and the bank transaction would stay FULLY_MATCHED with the still-open amount hidden.
     */
    @Transactional
    public void updateMatchedAmountForTransaction(Long transactionId) {
        List<BankTransactionMatch> matches = em.createQuery(
                "SELECT m FROM BankTransactionMatch m WHERE m.transaction.id = :txId",
                BankTransactionMatch.class)
                .setParameter("txId", transactionId)
                .getResultList();

        if (matches.isEmpty()) {
            return;
        }

        Transaction tx = em.find(Transaction.class, transactionId);
        BigDecimal newMatchedAmount = tx != null && tx.getTotal() != null
                ? tx.getTotal().abs()
                : BigDecimal.ZERO;

        for (BankTransactionMatch match : matches) {
            match.setMatchedAmount(newMatchedAmount);
        }

        // A transaction can be linked to several bank transactions; recompute each affected one exactly once.
        // Hibernate returns the same managed instance per row, so distinct() dedupes by identity here.
        matches.stream()
                .map(BankTransactionMatch::getBankTransaction)
                .distinct()
                .forEach(this::recomputeStatus);
    }

    @Transactional
    public void setIgnored(Long bankTxId) {
        BankTransaction bankTx = bankTransactionRepository.findByIdScoped(bankTxId);
        if (bankTx == null) {
            throw new NotFoundException("Bank transaction not found");
        }
        bankTx.setStatus(BankTransactionStatus.IGNORED);
        bankTx.setMatchedAmount(BigDecimal.ZERO);
    }

    @Transactional
    public void unignore(Long bankTxId) {
        BankTransaction bankTx = bankTransactionRepository.findByIdScoped(bankTxId);
        if (bankTx == null) {
            throw new NotFoundException("Bank transaction not found");
        }
        recomputeStatus(bankTx);
    }

    /**
     * Returns the bank transactions linked (matched) to the given bookkeeping transaction — the reverse direction of
     * the N:M mapping. Scoped to the current organization.
     */
    public List<BankTransaction> getBankTransactionsForTransaction(Long transactionId) {
        Organization org = organizationContext.getCurrentOrganization();
        if (org == null) {
            return List.of();
        }
        return em.createQuery(
                "SELECT DISTINCT m.bankTransaction FROM BankTransactionMatch m "
                        + "WHERE m.transaction.id = :txId AND m.bankTransaction.organization.id = :orgId "
                        + "ORDER BY m.bankTransaction.bookingDate DESC",
                BankTransaction.class)
                .setParameter("txId", transactionId)
                .setParameter("orgId", org.getId())
                .getResultList();
    }

    /**
     * Returns the total magnitude of bank movement linked to the given bookkeeping transaction — the sum of the
     * absolute amounts of all bank transactions matched to it. Used to check whether a transaction's amount is fully
     * covered by bank transactions before it may be confirmed. Bank amount and transaction total share the same sign
     * convention, so absolute values are compared.
     */
    public BigDecimal getCoveredAmountForTransaction(Long transactionId) {
        return (BigDecimal) em.createQuery(
                "SELECT COALESCE(SUM(ABS(m.bankTransaction.amount)), 0) FROM BankTransactionMatch m WHERE m.transaction.id = :txId")
                .setParameter("txId", transactionId)
                .getSingleResult();
    }

    public List<Long> getMatchedTransactionIds(Long bankTxId) {
        return em.createQuery(
                "SELECT m.transaction.id FROM BankTransactionMatch m WHERE m.bankTransaction.id = :bankTxId",
                Long.class)
                .setParameter("bankTxId", bankTxId)
                .getResultList();
    }

    private void recomputeStatus(BankTransaction bankTx) {
        BigDecimal matchedAmount = (BigDecimal) em.createQuery(
                "SELECT COALESCE(SUM(m.matchedAmount), 0) FROM BankTransactionMatch m WHERE m.bankTransaction.id = :bankTxId")
                .setParameter("bankTxId", bankTx.getId())
                .getSingleResult();

        bankTx.setMatchedAmount(matchedAmount);

        BigDecimal absAmount = bankTx.getAmount().abs();
        if (matchedAmount.compareTo(BigDecimal.ZERO) == 0) {
            bankTx.setStatus(BankTransactionStatus.UNMATCHED);
        } else if (matchedAmount.compareTo(absAmount) >= 0) {
            bankTx.setStatus(BankTransactionStatus.FULLY_MATCHED);
        } else {
            bankTx.setStatus(BankTransactionStatus.PARTIALLY_MATCHED);
        }
    }
}
