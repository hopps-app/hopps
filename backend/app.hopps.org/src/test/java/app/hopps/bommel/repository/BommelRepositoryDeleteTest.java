package app.hopps.bommel.repository;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.domain.BommelTestResourceCreator;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.organization.domain.Organization;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Deleting a bommel removes it and its sub-bommels, but keeps everything booked on them: transactions and receipts are
 * detached (and reopened if they were confirmed, since confirming requires a bommel), bank accounts move up to the
 * deleted bommel's parent.
 */
@QuarkusTest
class BommelRepositoryDeleteTest {

    @Inject
    BommelRepository bommelRepo;

    @Inject
    BommelTestResourceCreator resourceCreator;

    @Inject
    EntityManager em;

    @Test
    @TestTransaction
    void recursiveDeleteKeepsTransactionsAndReceiptsAndMovesBankAccountsUp() {
        // root -> child 1 -> inner child 3, root -> child 2
        List<Bommel> bommels = resourceCreator.setupSimpleTree();
        Bommel root = bommels.get(0);
        Bommel child1 = bommels.get(1);
        Bommel child2 = bommels.get(2);
        Bommel innerChild = bommels.get(3);
        Organization org = em
                .createQuery("SELECT o FROM Organization o WHERE o.rootBommel.id = :rootId", Organization.class)
                .setParameter("rootId", root.id)
                .getSingleResult();

        // Booked on the inner child, i.e. below the bommel that gets deleted
        Transaction transaction = new Transaction();
        transaction.setOrganization(org);
        transaction.setCreatedBy("tester");
        transaction.setStatus(TransactionStatus.DRAFT);
        transaction.setName("Trikots");
        transaction.setBommel(innerChild);
        em.persist(transaction);

        Document receipt = new Document();
        receipt.setOrganization(org);
        receipt.setFileName("beleg.pdf");
        receipt.setBommel(innerChild);
        em.persist(receipt);

        BankAccount account = new BankAccount();
        account.setOrganization(org);
        account.setBommel(innerChild);
        account.setName("Projektkonto");
        account.setIban("DE89370400440532013000");
        account.setCreatedBy("tester");
        em.persist(account);

        // Booked on a sibling that stays
        Transaction untouched = new Transaction();
        untouched.setOrganization(org);
        untouched.setCreatedBy("tester");
        untouched.setStatus(TransactionStatus.DRAFT);
        untouched.setName("Hallenmiete");
        untouched.setBommel(child2);
        em.persist(untouched);

        em.flush();
        em.clear();

        bommelRepo.deleteBommel(bommelRepo.findById(child1.id), true);
        em.flush();
        em.clear();

        assertNull(bommelRepo.findById(child1.id));
        assertNull(bommelRepo.findById(innerChild.id));

        Transaction keptTransaction = em.find(Transaction.class, transaction.id);
        assertNotNull(keptTransaction);
        assertNull(keptTransaction.getBommel());

        Document keptReceipt = em.find(Document.class, receipt.id);
        assertNotNull(keptReceipt);
        assertNull(keptReceipt.getBommel());

        assertEquals(root.id, em.find(BankAccount.class, account.id).getBommel().id);
        assertEquals(child2.id, em.find(Transaction.class, untouched.id).getBommel().id);
    }

    @Test
    @TestTransaction
    void deleteReopensWhatWasConfirmedOnTheDeletedBommels() {
        // root -> child 1 -> inner child 3, root -> child 2
        List<Bommel> bommels = resourceCreator.setupSimpleTree();
        Bommel root = bommels.get(0);
        Bommel child1 = bommels.get(1);
        Bommel child2 = bommels.get(2);
        Bommel innerChild = bommels.get(3);
        Organization org = em
                .createQuery("SELECT o FROM Organization o WHERE o.rootBommel.id = :rootId", Organization.class)
                .setParameter("rootId", root.id)
                .getSingleResult();

        // A confirmed transaction with its confirmed receipt, below the deleted bommel
        Document confirmedReceipt = new Document();
        confirmedReceipt.setOrganization(org);
        confirmedReceipt.setFileName("rechnung.pdf");
        confirmedReceipt.setBommel(innerChild);
        confirmedReceipt.setDocumentStatus(DocumentStatus.CONFIRMED);
        em.persist(confirmedReceipt);

        Transaction confirmed = new Transaction();
        confirmed.setOrganization(org);
        confirmed.setCreatedBy("tester");
        confirmed.setStatus(TransactionStatus.CONFIRMED);
        confirmed.setName("Trikots");
        confirmed.setBommel(innerChild);
        confirmed.setDocument(confirmedReceipt);
        em.persist(confirmed);

        // A confirmed receipt on the deleted bommel without a transaction
        Document lonelyReceipt = new Document();
        lonelyReceipt.setOrganization(org);
        lonelyReceipt.setFileName("quittung.pdf");
        lonelyReceipt.setBommel(child1);
        lonelyReceipt.setDocumentStatus(DocumentStatus.CONFIRMED);
        em.persist(lonelyReceipt);

        // Confirmed on a sibling that stays: must not be touched
        Transaction untouched = new Transaction();
        untouched.setOrganization(org);
        untouched.setCreatedBy("tester");
        untouched.setStatus(TransactionStatus.CONFIRMED);
        untouched.setName("Hallenmiete");
        untouched.setBommel(child2);
        em.persist(untouched);

        em.flush();
        em.clear();

        bommelRepo.deleteBommel(bommelRepo.findById(child1.id), true);
        em.flush();
        em.clear();

        Transaction reopened = em.find(Transaction.class, confirmed.id);
        assertEquals(TransactionStatus.DRAFT, reopened.getStatus());
        assertNull(reopened.getBommel());
        assertEquals(DocumentStatus.ANALYZED, em.find(Document.class, confirmedReceipt.id).getDocumentStatus());
        assertEquals(DocumentStatus.ANALYZED, em.find(Document.class, lonelyReceipt.id).getDocumentStatus());
        assertEquals(TransactionStatus.CONFIRMED, em.find(Transaction.class, untouched.id).getStatus());
    }

    @Test
    @TestTransaction
    void deletingALeafWithAReceiptSucceeds() {
        List<Bommel> bommels = resourceCreator.setupSimpleTree();
        Bommel root = bommels.get(0);
        Bommel leaf = bommels.get(2);
        Organization org = em
                .createQuery("SELECT o FROM Organization o WHERE o.rootBommel.id = :rootId", Organization.class)
                .setParameter("rootId", root.id)
                .getSingleResult();

        Document receipt = new Document();
        receipt.setOrganization(org);
        receipt.setFileName("beleg.pdf");
        receipt.setBommel(leaf);
        em.persist(receipt);
        em.flush();
        em.clear();

        bommelRepo.deleteBommel(bommelRepo.findById(leaf.id), false);
        em.flush();
        em.clear();

        assertNull(bommelRepo.findById(leaf.id));
        assertNull(em.find(Document.class, receipt.id).getBommel());
    }
}
