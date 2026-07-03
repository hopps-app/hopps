package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionMatch;
import app.hopps.bankimport.domain.BankTransactionMatchType;
import app.hopps.bankimport.domain.BankTransactionStatus;
import app.hopps.bommel.domain.Bommel;
import app.hopps.organization.domain.Organization;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

@QuarkusTest
class BankTransactionMatchServiceTest {

    @Inject
    BankTransactionMatchService matchService;

    @Inject
    EntityManager em;

    /**
     * When a bookkeeping transaction that is matched to a bank transaction is deleted, the bank transaction must no
     * longer be considered "matched": its status returns to UNMATCHED, the matched amount drops to zero and the match
     * row is gone.
     */
    @Test
    @TestTransaction
    void deletingMatchedTransactionResetsBankTransactionStatus() {
        Fixture f = createFullyMatchedFixture();

        // Precondition: the bank transaction is fully matched.
        assertEquals(BankTransactionStatus.FULLY_MATCHED, f.bankTx.getStatus());

        // Act: simulate the transaction being deleted — its matches are cleaned up.
        matchService.removeMatchesForTransaction(f.transaction.getId());

        // Assert: the bank transaction is unmatched again and no match remains.
        BankTransaction reloaded = em.find(BankTransaction.class, f.bankTx.getId());
        assertEquals(BankTransactionStatus.UNMATCHED, reloaded.getStatus());
        assertEquals(0, reloaded.getMatchedAmount().compareTo(BigDecimal.ZERO));

        Long matchCount = em.createQuery(
                "SELECT COUNT(m) FROM BankTransactionMatch m WHERE m.transaction.id = :txId", Long.class)
                .setParameter("txId", f.transaction.getId())
                .getSingleResult();
        assertEquals(0L, matchCount);
    }

    @Test
    @TestTransaction
    void removeMatchesForTransactionWithoutMatchesIsNoop() {
        assertDoesNotThrow(() -> matchService.removeMatchesForTransaction(999_999L));
    }

    /**
     * When the amount of a matched transaction is reduced (e.g. the receipt only covers part of the bank movement), the
     * bank transaction must drop from FULLY_MATCHED to PARTIALLY_MATCHED, and both the match snapshot and the
     * denormalized matched amount must reflect the new, smaller total — so the still-open amount reappears in the list.
     */
    @Test
    @TestTransaction
    void reducingMatchedTransactionAmountMarksBankTransactionPartiallyMatched() {
        Fixture f = createFullyMatchedFixture();

        // Precondition: the -49.90 bank transaction is fully covered.
        assertEquals(BankTransactionStatus.FULLY_MATCHED, f.bankTx.getStatus());

        // Act: the receipt only covers 20.00 — the user reduces the transaction amount.
        f.transaction.setTotal(new BigDecimal("-20.00"));
        em.flush();
        matchService.updateMatchedAmountForTransaction(f.transaction.getId());

        // Assert: the bank transaction is only partially matched now, with the reduced amount everywhere.
        BankTransaction reloaded = em.find(BankTransaction.class, f.bankTx.getId());
        assertEquals(BankTransactionStatus.PARTIALLY_MATCHED, reloaded.getStatus());
        assertEquals(0, reloaded.getMatchedAmount().compareTo(new BigDecimal("20.00")));

        BankTransactionMatch match = em.createQuery(
                "SELECT m FROM BankTransactionMatch m WHERE m.transaction.id = :txId", BankTransactionMatch.class)
                .setParameter("txId", f.transaction.getId())
                .getSingleResult();
        assertEquals(0, match.getMatchedAmount().compareTo(new BigDecimal("20.00")));
    }

    @Test
    @TestTransaction
    void updateMatchedAmountForTransactionWithoutMatchesIsNoop() {
        assertDoesNotThrow(() -> matchService.updateMatchedAmountForTransaction(999_999L));
    }

    // ── Test fixture ────────────────────────────────────────────────────────────

    private record Fixture(BankTransaction bankTx, Transaction transaction) {
    }

    private Fixture createFullyMatchedFixture() {
        Organization org = em.createQuery("SELECT o FROM Organization o", Organization.class)
                .setMaxResults(1)
                .getResultList()
                .get(0);
        Bommel bommel = em.createQuery("SELECT b FROM Bommel b WHERE b.organization = :org", Bommel.class)
                .setParameter("org", org)
                .setMaxResults(1)
                .getResultList()
                .get(0);

        BankAccount account = new BankAccount();
        account.setOrganization(org);
        account.setBommel(bommel);
        account.setName("Test account");
        account.setIban("DE89370400440532013000");
        account.setCreatedBy("tester");
        em.persist(account);

        BankImport bankImport = new BankImport();
        bankImport.setOrganization(org);
        bankImport.setBankAccount(account);
        bankImport.setFileName("test.csv");
        bankImport.setFileSize(0);
        bankImport.setFileSha256("testsha");
        bankImport.setImportedBy("tester");
        em.persist(bankImport);

        BigDecimal amount = new BigDecimal("-49.90");

        BankTransaction bankTx = new BankTransaction();
        bankTx.setOrganization(org);
        bankTx.setBankAccount(account);
        bankTx.setBankImport(bankImport);
        bankTx.setBookingDate(LocalDate.of(2026, 5, 15));
        bankTx.setAmount(amount);
        bankTx.setCurrency("EUR");
        bankTx.setDedupeHash("testhash-reset");
        bankTx.setStatus(BankTransactionStatus.UNMATCHED);
        bankTx.setMatchedAmount(BigDecimal.ZERO);
        em.persist(bankTx);

        Transaction transaction = new Transaction();
        transaction.setOrganization(org);
        transaction.setCreatedBy("tester");
        transaction.setStatus(TransactionStatus.DRAFT);
        transaction.setName("Bürobedarf");
        transaction.setTotal(amount);
        em.persist(transaction);

        // Link them and reflect the matched state (as BankTransactionMatchService.addMatch would).
        BankTransactionMatch match = new BankTransactionMatch();
        match.setBankTransaction(bankTx);
        match.setTransaction(transaction);
        match.setMatchedAmount(amount.abs());
        match.setMatchType(BankTransactionMatchType.MANUAL);
        match.setMatchedBy("tester");
        em.persist(match);

        bankTx.setStatus(BankTransactionStatus.FULLY_MATCHED);
        bankTx.setMatchedAmount(amount.abs());
        em.flush();

        return new Fixture(bankTx, transaction);
    }
}
