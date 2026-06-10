package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionMatch;
import app.hopps.bankimport.domain.BankTransactionMatchType;
import app.hopps.bankimport.domain.BankTransactionStatus;
import app.hopps.bankimport.repository.BankTransactionRepository;
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
        match.setMatchedAmount(tx.getTotal() != null ? new BigDecimal(tx.getTotal().toString()) : BigDecimal.ZERO);
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
