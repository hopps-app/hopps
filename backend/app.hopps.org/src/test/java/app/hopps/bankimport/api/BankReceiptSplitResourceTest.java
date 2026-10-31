package app.hopps.bankimport.api;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankImportStatus;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentDirection;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

/**
 * Splitting a receipt that is already linked to its payment, as in the bank drawer: the receipt is linked first and
 * split while it is reviewed. The movement paid the whole receipt, so it pays the new parts too. (The other order,
 * split first and link afterwards, is covered in BankTransactionMatchServiceTest.)
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
class BankReceiptSplitResourceTest {

    private static final long ORGANIZATION_ID = 4L;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    EntityManager em;

    private Long bankTxId;
    private Long documentId;
    private Long transactionId;
    private Integer secondPartId;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    /** A movement, and a receipt with one draft transaction for its whole amount, linked to the movement. */
    private void linkedReceipt(String movement, String receiptTotal) {
        QuarkusTransaction.requiringNew().run(() -> {
            var organization = organizationRepository.findById(ORGANIZATION_ID);

            BankAccount account = new BankAccount();
            account.setOrganization(organization);
            account.setBommel(organization.getRootBommel());
            account.setName("Splitkonto");
            account.setIban("DE89370400440532013000");
            account.setCreatedBy("alice@example.test");
            em.persist(account);

            BankImport bankImport = new BankImport();
            bankImport.setOrganization(organization);
            bankImport.setBankAccount(account);
            bankImport.setFileName("split.csv");
            bankImport.setFileSize(0);
            bankImport.setFileSha256("test-sha-split");
            bankImport.setImportedBy("alice@example.test");
            bankImport.setStatus(BankImportStatus.COMPLETED);
            em.persist(bankImport);

            BankTransaction bankTx = new BankTransaction();
            bankTx.setOrganization(organization);
            bankTx.setBankAccount(account);
            bankTx.setBankImport(bankImport);
            bankTx.setBookingDate(LocalDate.of(2026, 5, 15));
            bankTx.setAmount(new BigDecimal(movement));
            bankTx.setCurrency("EUR");
            bankTx.setDedupeHash("split-h1");
            em.persist(bankTx);

            Document document = new Document();
            document.setOrganization(organization);
            document.setName("Getränke Sommerfest");
            document.setTotal(new BigDecimal(receiptTotal));
            document.setDirection(DocumentDirection.INCOMING);
            em.persist(document);

            Transaction transaction = new Transaction();
            transaction.setOrganization(organization);
            transaction.setCreatedBy("alice@example.test");
            transaction.setStatus(TransactionStatus.DRAFT);
            transaction.setName("Getränke Sommerfest");
            transaction.setTotal(new BigDecimal(receiptTotal).negate());
            transaction.setDocument(document);
            em.persist(transaction);

            bankTxId = bankTx.getId();
            documentId = document.getId();
            transactionId = transaction.getId();
        });
        given().contentType(ContentType.JSON)
                .body("{ \"transactionId\": " + transactionId + " }")
                .post("/bank-transactions/{id}/matches", bankTxId)
                .then()
                .statusCode(204);
    }

    /** Splits into the existing transaction and a second part, which is new the first time. */
    private void split(String first, String second) {
        String secondPart = secondPartId != null ? "\"id\": " + secondPartId + ", " : "";
        secondPartId = given().contentType(ContentType.JSON)
                .body("{ \"parts\": [ { \"id\": " + transactionId + ", \"amount\": " + first + " }, { " + secondPart
                        + "\"amount\": " + second + " } ], \"confirmDocument\": false }")
                .put("/documents/{id}/transactions", documentId)
                .then()
                .statusCode(200)
                .extract()
                .path("[1].id");
    }

    private void assertMovement(int links, String status) {
        given().get("/bank-transactions/{id}/matches", bankTxId).then().statusCode(200).body("$", hasSize(links));
        given().get("/bank-transactions/{id}", bankTxId).then().statusCode(200).body("status", is(status));
    }

    @Test
    void thePaymentOfTheWholeReceiptPaysTheNewPartToo() {
        linkedReceipt("-298.40", "298.40");

        split("200.00", "98.40");

        assertMovement(2, "FULLY_MATCHED");
    }

    @Test
    void savingTheSplitAgainDoesNotLinkTwice() {
        linkedReceipt("-298.40", "298.40");
        split("200.00", "98.40");

        split("198.40", "100.00");

        assertMovement(2, "FULLY_MATCHED");
    }

    @Test
    void aPrivateShareStaysOpenOnTheMovement() {
        linkedReceipt("-100.00", "100.00");

        split("60.00", "20.00");

        assertMovement(2, "PARTIALLY_MATCHED");
    }

    @Test
    void aMovementOfAnotherAmountOnlyKeepsItsPart() {
        linkedReceipt("-80.00", "100.00");

        split("80.00", "20.00");

        assertMovement(1, "FULLY_MATCHED");
    }
}
