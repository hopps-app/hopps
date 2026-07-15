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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
        addMatch(bankTxId, transactionId, username, null);
    }

    /**
     * Links a bank transaction to a bookkeeping transaction. {@code requestedAmount} is the portion of the bank
     * movement that is used for this transaction (the allocation): pass {@code null} for the default full amount, or an
     * explicit value to split e.g. one collective transfer across several transactions. An explicit amount is stored as
     * a manual allocation and is not overwritten by later transaction-amount changes.
     */
    @Transactional
    public void addMatch(Long bankTxId, Long transactionId, String username, BigDecimal requestedAmount) {
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

        boolean manual = requestedAmount != null;

        // When the transaction has no amount yet (e.g. it was cleared because the analysed value was in the wrong
        // currency), adopt the bank transaction's signed euro amount so the booking gets its correct value from the
        // reconciled movement. Only for the default (full) link — an explicit partial allocation means the user is
        // splitting the movement and the transaction is expected to already carry its own total.
        if (!manual && (tx.getTotal() == null || tx.getTotal().signum() == 0)) {
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

        // matchedAmount is the covered magnitude (always positive). Both bank amount and transaction total share the
        // same sign (expense = negative, income = positive), so we compare absolute values in recomputeStatus.
        BigDecimal allocation = manual
                ? validateAllocation(requestedAmount, tx.getTotal())
                : defaultAllocation(tx.getTotal(), bankTx.getAmount());

        BankTransactionMatch match = new BankTransactionMatch();
        match.setBankTransaction(bankTx);
        match.setTransaction(tx);
        match.setMatchedAmount(allocation);
        match.setAmountManual(manual);
        match.setMatchType(BankTransactionMatchType.MANUAL);
        match.setMatchedBy(username);
        em.persist(match);

        recomputeStatus(bankTx);
    }

    /**
     * Updates the allocation (used amount) of an existing match and marks it as manual, then recomputes the bank
     * transaction status. Used to disentangle a collective transfer after the fact.
     */
    @Transactional
    public void updateMatchAmount(Long bankTxId, Long transactionId, BigDecimal amount) {
        BankTransaction bankTx = bankTransactionRepository.findByIdScoped(bankTxId);
        if (bankTx == null) {
            throw new NotFoundException("Bank transaction not found");
        }

        BankTransactionMatch match = em.createQuery(
                "SELECT m FROM BankTransactionMatch m WHERE m.bankTransaction.id = :bankTxId AND m.transaction.id = :txId",
                BankTransactionMatch.class)
                .setParameter("bankTxId", bankTxId)
                .setParameter("txId", transactionId)
                .getResultStream()
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Match not found"));

        match.setMatchedAmount(validateAllocation(amount, match.getTransaction().getTotal()));
        match.setAmountManual(true);

        recomputeStatus(bankTx);
    }

    /**
     * The default allocation for a new match: the transaction's full amount — deliberately not capped at the bank
     * movement, so that assigning more than a movement holds surfaces as visible over-coverage in the reconciliation
     * panels instead of being silently hidden. For an amountless transaction the bank movement's magnitude is adopted.
     */
    private static BigDecimal defaultAllocation(BigDecimal txTotal, BigDecimal bankAmount) {
        if (txTotal == null || txTotal.signum() == 0) {
            return bankAmount.abs();
        }
        return txTotal.abs();
    }

    /**
     * Validates a user-supplied allocation: it must be positive and cannot exceed the transaction's own amount — you
     * cannot attribute more to a transaction than it is worth. It may still exceed the bank movement, so that
     * over-assignment across several transactions stays representable (and visible) rather than being capped away.
     */
    private static BigDecimal validateAllocation(BigDecimal amount, BigDecimal txTotal) {
        if (amount == null || amount.signum() <= 0) {
            throw new BadRequestException("Allocation amount must be positive");
        }
        if (txTotal != null && txTotal.signum() != 0 && amount.compareTo(txTotal.abs()) > 0) {
            throw new BadRequestException("Allocation amount cannot exceed the transaction amount");
        }
        return amount;
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
        BigDecimal txTotal = tx != null ? tx.getTotal() : null;
        boolean noTotal = txTotal == null || txTotal.signum() == 0;

        for (BankTransactionMatch match : matches) {
            // Never clobber a hand-set partial allocation — the user split this movement deliberately.
            if (match.isAmountManual()) {
                continue;
            }
            // Re-snapshot the default (full) allocation to the transaction's current total (uncapped, mirroring
            // addMatch); a transaction that lost its amount drops back to no coverage.
            match.setMatchedAmount(noTotal ? BigDecimal.ZERO : txTotal.abs());
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
     * Returns the magnitude of net bank movement linked to the given bookkeeping transaction — the absolute value of
     * the (signed) sum of all matched bank transactions' amounts. Used to check whether a transaction's amount is fully
     * covered before it may be confirmed. Summing signed (not absolute) amounts lets opposite movements net out, e.g.
     * -5, +5, -5 covers a 5 expense; summing absolute values would over-count them to 15 and block confirmation.
     */
    public BigDecimal getCoveredAmountForTransaction(Long transactionId) {
        // Sum the per-match allocations (matchedAmount, always positive), signed by the direction of the bank movement
        // they come from. This respects partial allocations — a collective transfer only counts the portion actually
        // used for this transaction, not its whole amount — while still letting opposite movements (e.g. a refund) net
        // out, exactly like summing the signed bank amounts did before allocations existed.
        BigDecimal netAmount = (BigDecimal) em.createQuery(
                "SELECT COALESCE(SUM(CASE WHEN m.bankTransaction.amount < 0 THEN -m.matchedAmount ELSE m.matchedAmount END), 0) "
                        + "FROM BankTransactionMatch m WHERE m.transaction.id = :txId")
                .setParameter("txId", transactionId)
                .getSingleResult();
        return netAmount.abs();
    }

    /**
     * Returns the allocation (used amount) per matched transaction for a bank transaction — {@code transactionId ->
     * matchedAmount}. Powers the editable "amount used" on the bank-transaction side.
     */
    public Map<Long, BigDecimal> getAllocationsByTransactionForBankTransaction(Long bankTxId) {
        return toAllocationMap(em.createQuery(
                "SELECT m.transaction.id, m.matchedAmount FROM BankTransactionMatch m WHERE m.bankTransaction.id = :bankTxId",
                Object[].class)
                .setParameter("bankTxId", bankTxId)
                .getResultList());
    }

    /**
     * Returns the allocation (used amount) per matched bank transaction for a bookkeeping transaction — {@code
     * bankTransactionId -> matchedAmount}. Powers the editable "amount used" on the transaction side.
     */
    public Map<Long, BigDecimal> getAllocationsByBankTransactionForTransaction(Long transactionId) {
        return toAllocationMap(em.createQuery(
                "SELECT m.bankTransaction.id, m.matchedAmount FROM BankTransactionMatch m WHERE m.transaction.id = :txId",
                Object[].class)
                .setParameter("txId", transactionId)
                .getResultList());
    }

    private static Map<Long, BigDecimal> toAllocationMap(List<Object[]> rows) {
        Map<Long, BigDecimal> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put((Long) row[0], (BigDecimal) row[1]);
        }
        return map;
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
