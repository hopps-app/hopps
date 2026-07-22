package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionMatch;
import app.hopps.bankimport.domain.BankTransactionMatchType;
import app.hopps.bankimport.domain.BankTransactionStatus;
import app.hopps.bommel.domain.Bommel;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import io.quarkus.test.InjectMock;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.ws.rs.BadRequestException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@QuarkusTest
class BankTransactionMatchServiceTest {

    @Inject
    BankTransactionMatchService matchService;

    @Inject
    EntityManager em;

    // addMatch() looks the bank transaction up scoped to the current organization; without an authenticated request the
    // context would resolve to null, so we stub it to the org used by the test below.
    @InjectMock
    OrganizationContext organizationContext;

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
        // Signed net coverage of an expense movement is negative.
        assertEquals(0, reloaded.getMatchedAmount().compareTo(new BigDecimal("-20.00")));

        BankTransactionMatch match = em.createQuery(
                "SELECT m FROM BankTransactionMatch m WHERE m.transaction.id = :txId", BankTransactionMatch.class)
                .setParameter("txId", f.transaction.getId())
                .getSingleResult();
        // The per-match allocation stays a positive magnitude.
        assertEquals(0, match.getMatchedAmount().compareTo(new BigDecimal("20.00")));
    }

    @Test
    @TestTransaction
    void updateMatchedAmountForTransactionWithoutMatchesIsNoop() {
        assertDoesNotThrow(() -> matchService.updateMatchedAmountForTransaction(999_999L));
    }

    /**
     * When a transaction without an amount (e.g. it was cleared because the analysed value was in the wrong currency)
     * is matched to a bank movement, it adopts the bank transaction's euro amount and becomes fully covered.
     */
    @Test
    @TestTransaction
    void addingMatchFillsEmptyTransactionAmountFromBankMovement() {
        Organization org = em.createQuery("SELECT o FROM Organization o", Organization.class)
                .setMaxResults(1)
                .getResultList()
                .get(0);
        Bommel bommel = em.createQuery("SELECT b FROM Bommel b WHERE b.organization = :org", Bommel.class)
                .setParameter("org", org)
                .setMaxResults(1)
                .getResultList()
                .get(0);

        // addMatch resolves the bank transaction scoped to the current organization.
        when(organizationContext.getCurrentOrganizationId()).thenReturn(org.getId());

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
        bankImport.setFileSha256("testsha-autofill");
        bankImport.setImportedBy("tester");
        em.persist(bankImport);

        BigDecimal bankAmount = new BigDecimal("-49.90");
        BankTransaction bankTx = new BankTransaction();
        bankTx.setOrganization(org);
        bankTx.setBankAccount(account);
        bankTx.setBankImport(bankImport);
        bankTx.setBookingDate(LocalDate.of(2026, 5, 15));
        bankTx.setAmount(bankAmount);
        bankTx.setCurrency("EUR");
        bankTx.setDedupeHash("testhash-autofill");
        bankTx.setStatus(BankTransactionStatus.UNMATCHED);
        bankTx.setMatchedAmount(BigDecimal.ZERO);
        em.persist(bankTx);

        // A transaction with no amount yet.
        Transaction tx = new Transaction();
        tx.setOrganization(org);
        tx.setCreatedBy("tester");
        tx.setStatus(TransactionStatus.DRAFT);
        tx.setName("Adobe");
        tx.setTotal(null);
        em.persist(tx);
        em.flush();

        matchService.addMatch(bankTx.getId(), tx.getId(), "tester");

        Transaction reloadedTx = em.find(Transaction.class, tx.getId());
        assertEquals(0, reloadedTx.getTotal().compareTo(bankAmount),
                "transaction amount is filled from the bank movement");

        BankTransaction reloadedBankTx = em.find(BankTransaction.class, bankTx.getId());
        assertEquals(BankTransactionStatus.FULLY_MATCHED, reloadedBankTx.getStatus());
    }

    /**
     * Linking with an explicit partial amount records that amount as the allocation, marks it as manual and leaves the
     * bank transaction only partially matched — the core of splitting a collective transfer across transactions.
     */
    @Test
    @TestTransaction
    void addingMatchWithExplicitAmountStoresPartialAllocation() {
        Fixture f = createUnmatchedFixture("-100.00", "-100.00", "partial-add");

        matchService.addMatch(f.bankTx.getId(), f.transaction.getId(), "tester", new BigDecimal("40.00"));

        BankTransactionMatch match = singleMatch(f.transaction.getId());
        assertEquals(0, match.getMatchedAmount().compareTo(new BigDecimal("40.00")));
        assertTrue(match.isAmountManual(), "an explicit amount is stored as a manual allocation");

        BankTransaction reloaded = em.find(BankTransaction.class, f.bankTx.getId());
        assertEquals(BankTransactionStatus.PARTIALLY_MATCHED, reloaded.getStatus());
        // Signed net coverage of the expense movement is negative.
        assertEquals(0, reloaded.getMatchedAmount().compareTo(new BigDecimal("-40.00")));
    }

    /**
     * A hand-set partial allocation must survive a later change to the transaction amount — unlike the default
     * full-amount snapshot, which is re-synced.
     */
    @Test
    @TestTransaction
    void manualAllocationIsNotOverwrittenWhenTransactionAmountChanges() {
        Fixture f = createUnmatchedFixture("-100.00", "-100.00", "partial-keep");
        matchService.addMatch(f.bankTx.getId(), f.transaction.getId(), "tester", new BigDecimal("40.00"));

        f.transaction.setTotal(new BigDecimal("-60.00"));
        em.flush();
        matchService.updateMatchedAmountForTransaction(f.transaction.getId());

        BankTransactionMatch match = singleMatch(f.transaction.getId());
        assertEquals(0, match.getMatchedAmount().compareTo(new BigDecimal("40.00")),
                "the manual allocation stays put");
    }

    /**
     * Updating the allocation of an existing (default, full) match reduces the covered amount and flips the bank
     * transaction to PARTIALLY_MATCHED.
     */
    @Test
    @TestTransaction
    void updateMatchAmountReducesCoverage() {
        Fixture f = createUnmatchedFixture("-100.00", "-100.00", "partial-update");
        matchService.addMatch(f.bankTx.getId(), f.transaction.getId(), "tester");

        // Precondition: default link fully covers the movement.
        assertEquals(BankTransactionStatus.FULLY_MATCHED,
                em.find(BankTransaction.class, f.bankTx.getId()).getStatus());

        matchService.updateMatchAmount(f.bankTx.getId(), f.transaction.getId(), new BigDecimal("30.00"));

        BankTransactionMatch match = singleMatch(f.transaction.getId());
        assertEquals(0, match.getMatchedAmount().compareTo(new BigDecimal("30.00")));
        assertTrue(match.isAmountManual());

        BankTransaction reloaded = em.find(BankTransaction.class, f.bankTx.getId());
        assertEquals(BankTransactionStatus.PARTIALLY_MATCHED, reloaded.getStatus());
        // Signed net coverage of the expense movement is negative.
        assertEquals(0, reloaded.getMatchedAmount().compareTo(new BigDecimal("-30.00")));
    }

    /**
     * An allocation may exceed the transaction's own amount as long as it stays within the bank movement — several
     * movements can over-cover a transaction in total. Here 150 exceeds the transaction (100) but is within the
     * movement (200), so it is accepted.
     */
    @Test
    @TestTransaction
    void allocationExceedingTransactionAmountButWithinMovementIsAllowed() {
        Fixture f = createUnmatchedFixture("-200.00", "-100.00", "partial-txcap");

        matchService.addMatch(f.bankTx.getId(), f.transaction.getId(), "tester", new BigDecimal("150.00"));

        BankTransactionMatch match = singleMatch(f.transaction.getId());
        assertEquals(0, match.getMatchedAmount().compareTo(new BigDecimal("150.00")));
        assertTrue(match.isAmountManual());
    }

    /**
     * An allocation may NOT exceed the bank movement's own amount — a single match can never use more of a movement
     * than it holds. Here 80 exceeds the movement (50), so it is rejected.
     */
    @Test
    @TestTransaction
    void allocationExceedingBankAmountIsRejected() {
        Fixture f = createUnmatchedFixture("-50.00", "-100.00", "partial-over-movement");
        assertThrows(BadRequestException.class,
                () -> matchService.addMatch(f.bankTx.getId(), f.transaction.getId(), "tester",
                        new BigDecimal("80.00")));
    }

    @Test
    @TestTransaction
    void nonPositiveAllocationIsRejected() {
        Fixture f = createUnmatchedFixture("-100.00", "-100.00", "partial-zero");
        assertThrows(BadRequestException.class,
                () -> matchService.addMatch(f.bankTx.getId(), f.transaction.getId(), "tester", BigDecimal.ZERO));
    }

    /**
     * A zero-amount transaction ("durchlaufender Posten") has no direction, so an allocation to it must be signed by
     * the bank movement it is applied to. A −13.68 movement fully allocated to a zero transaction is therefore fully
     * matched with nothing left open — not counted as +13.68 (which would leave |−13.68 − 13.68| = 27.36 open).
     */
    @Test
    @TestTransaction
    void zeroAmountTransactionFullyMatchesOppositeDirectionMovement() {
        Fixture f = createUnmatchedFixture("-13.68", "0.00", "passthrough-expense");

        matchService.addMatch(f.bankTx.getId(), f.transaction.getId(), "tester", new BigDecimal("13.68"));

        BankTransaction reloaded = em.find(BankTransaction.class, f.bankTx.getId());
        assertEquals(BankTransactionStatus.FULLY_MATCHED, reloaded.getStatus());
        assertEquals(0, reloaded.getMatchedAmount().compareTo(new BigDecimal("-13.68")),
                "coverage of a zero-amount transaction is signed by the movement, so a −13.68 movement nets to −13.68");
    }

    // ── Test fixture ────────────────────────────────────────────────────────────

    private record Fixture(BankTransaction bankTx, Transaction transaction) {
    }

    private BankTransactionMatch singleMatch(Long transactionId) {
        return em.createQuery(
                "SELECT m FROM BankTransactionMatch m WHERE m.transaction.id = :txId", BankTransactionMatch.class)
                .setParameter("txId", transactionId)
                .getSingleResult();
    }

    /**
     * Creates an unmatched bank transaction and a separate (not yet linked) bookkeeping transaction so a test can drive
     * {@link BankTransactionMatchService#addMatch} itself. {@code tag} keeps the dedupe/import hashes unique per test.
     */
    private Fixture createUnmatchedFixture(String bankAmount, String txTotal, String tag) {
        Organization org = em.createQuery("SELECT o FROM Organization o", Organization.class)
                .setMaxResults(1)
                .getResultList()
                .get(0);
        Bommel bommel = em.createQuery("SELECT b FROM Bommel b WHERE b.organization = :org", Bommel.class)
                .setParameter("org", org)
                .setMaxResults(1)
                .getResultList()
                .get(0);

        when(organizationContext.getCurrentOrganizationId()).thenReturn(org.getId());

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
        bankImport.setFileSha256("testsha-" + tag);
        bankImport.setImportedBy("tester");
        em.persist(bankImport);

        BankTransaction bankTx = new BankTransaction();
        bankTx.setOrganization(org);
        bankTx.setBankAccount(account);
        bankTx.setBankImport(bankImport);
        bankTx.setBookingDate(LocalDate.of(2026, 5, 15));
        bankTx.setAmount(new BigDecimal(bankAmount));
        bankTx.setCurrency("EUR");
        bankTx.setDedupeHash("testhash-" + tag);
        bankTx.setStatus(BankTransactionStatus.UNMATCHED);
        bankTx.setMatchedAmount(BigDecimal.ZERO);
        em.persist(bankTx);

        Transaction transaction = new Transaction();
        transaction.setOrganization(org);
        transaction.setCreatedBy("tester");
        transaction.setStatus(TransactionStatus.DRAFT);
        transaction.setName("Bürobedarf");
        transaction.setTotal(new BigDecimal(txTotal));
        em.persist(transaction);
        em.flush();

        return new Fixture(bankTx, transaction);
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
        // Denormalized bank-tx coverage is the SIGNED net (same sign as the movement); the per-match allocation above
        // stays a positive magnitude.
        bankTx.setMatchedAmount(amount);
        em.flush();

        return new Fixture(bankTx, transaction);
    }
}
