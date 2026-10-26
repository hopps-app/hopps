package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankImportStatus;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.transaction.domain.Transaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * A receipt uploaded onto a bank transaction gets a DRAFT transaction from the bank movement. Once the receipt is
 * analysed, it fills in what the bank cannot know (tax, a readable name) without overwriting anything the user changed.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
class BankTransactionReceiptAnalysisTest {

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    DocumentRepository documentRepository;

    @Inject
    BankTransactionReceiptService receiptService;

    @Inject
    EntityManager em;

    private Long bankTxId;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
        seed();
    }

    /** One bank transaction of -119.00 ("SEPA-LASTSCHRIFT REF 4711") for Alice's organization (id 4). */
    @Transactional
    void seed() {
        Organization org = organizationRepository.findById(4L);

        BankAccount account = new BankAccount();
        account.setOrganization(org);
        account.setBommel(bommelRepository.findById(23L));
        account.setName("Receipt Account");
        account.setIban("DE89370400440532013000");
        account.setCreatedBy("alice@example.test");
        em.persist(account);

        BankImport bankImport = new BankImport();
        bankImport.setOrganization(org);
        bankImport.setBankAccount(account);
        bankImport.setFileName("receipt.csv");
        bankImport.setFileSize(0);
        bankImport.setFileSha256("test-sha-receipt");
        bankImport.setImportedBy("alice@example.test");
        bankImport.setStatus(BankImportStatus.COMPLETED);
        em.persist(bankImport);

        BankTransaction tx = new BankTransaction();
        tx.setOrganization(org);
        tx.setBankAccount(account);
        tx.setBankImport(bankImport);
        tx.setBookingDate(LocalDate.of(2024, 3, 15));
        tx.setAmount(new BigDecimal("-119.00"));
        tx.setCurrency("EUR");
        tx.setCounterpartyName("Druckerei Schmid");
        tx.setPurpose("SEPA-LASTSCHRIFT REF 4711");
        tx.setDedupeHash("receipt-h1");
        em.persist(tx);

        bankTxId = tx.getId();
    }

    /** Uploads a receipt onto the bank transaction without analysis and returns the document id. */
    private Long uploadReceipt() {
        Integer documentId = given()
                .multiPart("file", "receipt.pdf", "%PDF-1.4 receipt".getBytes(StandardCharsets.UTF_8),
                        "application/pdf")
                .queryParam("analyze", false)
                .when()
                .post("/bank-transactions/{id}/receipt", bankTxId)
                .then()
                .statusCode(201)
                .extract()
                .path("id");
        return documentId.longValue();
    }

    /** Stands in for the analysis: stores the extracted values and runs the step that follows it. */
    @Transactional
    void analyse(Long documentId, String name, BigDecimal totalTax) {
        Document document = documentRepository.findById(documentId);
        document.setName(name);
        document.setTotalTax(totalTax);
        receiptService.applyAnalysedReceipt(document);
    }

    @Transactional
    Transaction draftOf(Long documentId) {
        return documentRepository.findById(documentId).getTransactions().get(0);
    }

    @Transactional
    void changeDraft(Long documentId, String name, BigDecimal totalTax) {
        Transaction transaction = draftOf(documentId);
        transaction.setName(name);
        transaction.setTotalTax(totalTax);
    }

    @Transactional
    void markConfirmed(Long documentId) {
        documentRepository.findById(documentId).setDocumentStatus(DocumentStatus.CONFIRMED);
    }

    @Test
    void fillsTaxAndReplacesTheBankPurpose() {
        Long documentId = uploadReceipt();
        assertEquals("SEPA-LASTSCHRIFT REF 4711", draftOf(documentId).getName());

        analyse(documentId, "Plakate Der kleine Lord", new BigDecimal("19.00"));

        Transaction draft = draftOf(documentId);
        assertEquals("Plakate Der kleine Lord", draft.getName());
        assertEquals(0, new BigDecimal("19.00").compareTo(draft.getTotalTax()));
        // What the bank knows stays as the bank has it.
        assertEquals(0, new BigDecimal("-119.00").compareTo(draft.getTotal()));
    }

    @Test
    void keepsWhatTheUserChanged() {
        Long documentId = uploadReceipt();
        changeDraft(documentId, "Plakate Premiere", new BigDecimal("7.00"));

        analyse(documentId, "Plakate Der kleine Lord", new BigDecimal("19.00"));

        Transaction draft = draftOf(documentId);
        assertEquals("Plakate Premiere", draft.getName());
        assertEquals(0, new BigDecimal("7.00").compareTo(draft.getTotalTax()));
    }

    @Test
    void leavesAConfirmedReceiptAlone() {
        Long documentId = uploadReceipt();
        markConfirmed(documentId);

        analyse(documentId, "Plakate Der kleine Lord", new BigDecimal("19.00"));

        Transaction draft = draftOf(documentId);
        assertEquals("SEPA-LASTSCHRIFT REF 4711", draft.getName());
        assertNull(draft.getTotalTax());
    }
}
