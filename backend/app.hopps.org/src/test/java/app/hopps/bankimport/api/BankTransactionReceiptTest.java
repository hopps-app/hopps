package app.hopps.bankimport.api;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.service.DocumentAnalysisService;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.core.MediaType;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;

/**
 * A receipt uploaded onto a bank transaction creates no bookkeeping transaction and no match until it is confirmed, the
 * same as a receipt uploaded on the receipts page. Confirming creates the transaction, fills what the receipt left
 * empty from the bank movement and matches it to that bank transaction.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
class BankTransactionReceiptTest {

    @InjectMock
    DocumentAnalysisService analysisServiceMock;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    EntityManager em;

    private Long bankTxId;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
        doNothing().when(analysisServiceMock).analyzeAsync(anyLong());
        bankTxId = seedBankTransaction();
    }

    /**
     * Seeds one outgoing bank transaction (-50.00 "Beta Cleaning" / "Window cleaning") for alice's organization (id 4).
     */
    @Transactional
    Long seedBankTransaction() {
        Organization org = organizationRepository.findById(4L);

        BankAccount account = new BankAccount();
        account.setOrganization(org);
        account.setBommel(bommelRepository.findById(23L));
        account.setName("Test Account");
        account.setIban("DE89370400440532013000");
        account.setCreatedBy("alice@example.test");
        em.persist(account);

        BankImport bankImport = new BankImport();
        bankImport.setOrganization(org);
        bankImport.setBankAccount(account);
        bankImport.setFileName("test.csv");
        bankImport.setFileSize(0);
        bankImport.setFileSha256("test-sha-bank-receipt");
        bankImport.setImportedBy("alice@example.test");
        em.persist(bankImport);

        BankTransaction tx = new BankTransaction();
        tx.setOrganization(org);
        tx.setBankAccount(account);
        tx.setBankImport(bankImport);
        tx.setBookingDate(LocalDate.of(2024, 3, 15));
        tx.setAmount(new BigDecimal("-50.00"));
        tx.setCurrency("EUR");
        tx.setCounterpartyName("Beta Cleaning");
        tx.setPurpose("Window cleaning");
        tx.setDedupeHash("receipt-h1");
        em.persist(tx);
        return tx.id;
    }

    @Test
    void uploadCreatesNoTransactionAndNoMatch() {
        long documentId = uploadReceipt();

        given()
                .when()
                .get("/documents/{id}", documentId)
                .then()
                .statusCode(200)
                .body("transactionId", nullValue())
                .body("pendingBankTransactionId", is(bankTxId.intValue()))
                .body("direction", is("INCOMING"))
                .body("documentStatus", is("UPLOADED"));

        given()
                .when()
                .get("/bank-transactions/{id}", bankTxId)
                .then()
                .statusCode(200)
                .body("status", is("UNMATCHED"))
                .body("matchedTransactionIds", empty());
    }

    @Test
    void confirmCreatesTransactionFromBankMovementAndMatchesIt() {
        long documentId = uploadReceipt();

        Integer transactionId = given()
                .when()
                .post("/documents/{id}/confirm", documentId)
                .then()
                .statusCode(200)
                .body("documentStatus", is("CONFIRMED"))
                .body("transactionId", notNullValue())
                .body("pendingBankTransactionId", nullValue())
                .extract()
                .path("transactionId");

        // The receipt was not analysed, so every field comes from the bank movement.
        given()
                .when()
                .get("/transactions/{id}", transactionId)
                .then()
                .statusCode(200)
                .body("name", is("Window cleaning"))
                .body("total", is(-50.0f))
                .body("senderName", is("Beta Cleaning"))
                .body("status", is("DRAFT"));

        given()
                .when()
                .get("/bank-transactions/{id}", bankTxId)
                .then()
                .statusCode(200)
                .body("status", is("FULLY_MATCHED"))
                .body("matchedTransactionIds", is(List.of(transactionId)));
    }

    @Test
    void confirmStillWorksWhenBankTransactionWasIgnoredMeanwhile() {
        long documentId = uploadReceipt();

        given().when().post("/bank-transactions/{id}/ignore", bankTxId).then().statusCode(204);

        given()
                .when()
                .post("/documents/{id}/confirm", documentId)
                .then()
                .statusCode(200)
                .body("documentStatus", is("CONFIRMED"))
                .body("transactionId", notNullValue())
                .body("pendingBankTransactionId", nullValue());

        given()
                .when()
                .get("/bank-transactions/{id}", bankTxId)
                .then()
                .statusCode(200)
                .body("status", is("IGNORED"))
                .body("matchedTransactionIds", empty());
    }

    private long uploadReceipt() {
        // Unique content per call so the duplicate-file check never kicks in.
        byte[] pdf = ("%PDF-1.4 receipt " + System.nanoTime()).getBytes(StandardCharsets.UTF_8);
        Integer id = given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "receipt.pdf", pdf, "application/pdf")
                .queryParam("analyze", false)
                .when()
                .post("/bank-transactions/{id}/receipt", bankTxId)
                .then()
                .statusCode(201)
                .body("transactionId", nullValue())
                .extract()
                .path("id");
        return id;
    }
}
