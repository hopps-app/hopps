package app.hopps.bommel.repository;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.category.domain.CategoryGroup;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Deleting a bommel keeps what referenced it. Test data: "Workshops" (26) of Bühnefrei e.V. books the confirmed
 * transaction 4 of receipt 4, its only transaction; the club itself is bommel 23.
 */
@QuarkusTest
class BommelDeletionTest {

    private static final long WORKSHOPS = 26L;
    private static final long CLUB = 23L;

    @Inject
    BommelRepository repo;

    @Inject
    EntityManager em;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    @Test
    @TestTransaction
    @TestSecurity(user = "alice@example.test")
    void detachesTransactionsAndReceiptsAndSetsConfirmedTransactionsBackToDraft() {
        repo.deleteBommel(repo.findById(WORKSHOPS), false);
        em.flush();
        em.clear();

        Transaction transaction = em.find(Transaction.class, 4L);
        assertNull(transaction.getBommel());
        assertEquals(TransactionStatus.DRAFT, transaction.getStatus());

        // The receipt booked as only that transaction goes back to review, as when the transaction is reopened.
        Document receipt = em.find(Document.class, 4L);
        assertNull(receipt.getBommel());
        assertEquals(DocumentStatus.ANALYZED, receipt.getDocumentStatus());

        assertNull(repo.findById(WORKSHOPS));
    }

    @Test
    @TestTransaction
    @TestSecurity(user = "alice@example.test")
    void dropsTheCategoryValuesOfTransactionsThatLoseTheirBommel() {
        CategoryGroup group = new CategoryGroup();
        group.setName("Kostenstelle");
        group.setOrganization(repo.getOrganization(repo.findById(WORKSHOPS)));
        group.persist();
        em.find(Transaction.class, 4L).replaceCategoryValues(Map.of(group.id, "Technik"));
        em.flush();

        repo.deleteBommel(repo.findById(WORKSHOPS), false);
        em.flush();
        em.clear();

        assertTrue(em.find(Transaction.class, 4L).getCategoryValues().isEmpty());
    }

    @Test
    @TestTransaction
    @TestSecurity(user = "alice@example.test")
    void movesBankAccountsToTheParentBommel() {
        BankAccount account = em.find(BankAccount.class, 1L);
        account.setBommel(repo.findById(WORKSHOPS));
        em.flush();

        repo.deleteBommel(repo.findById(WORKSHOPS), false);
        em.flush();
        em.clear();

        assertEquals(CLUB, em.find(BankAccount.class, 1L).getBommel().id);
    }
}
