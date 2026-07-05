package app.hopps.transaction.api;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionMatch;
import app.hopps.bankimport.domain.BankTransactionMatchType;
import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.TradeParty;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import app.hopps.transaction.repository.TransactionRepository;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.keycloak.client.KeycloakTestClient;
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
import java.time.Instant;
import java.time.LocalDate;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
@TestHTTPEndpoint(TransactionResource.class)
class TransactionResourceTest {

    @Inject
    TransactionRepository transactionRepository;

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

    KeycloakTestClient keycloakClient = new KeycloakTestClient();

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
        clearPreExistingTransactions();
        setupTestData();
    }

    @Transactional
    void clearPreExistingTransactions() {
        transactionRepository.deleteAll();
    }

    @Transactional
    void setupTestData() {
        // alice@example.test is in organization 4 (buehnefrei-ev)
        Organization org = organizationRepository.findById(4L);
        // Bommel 23 is the root bommel for organization 4
        // Bommel 24-30 are children in organization 4
        Bommel bommelWithTransactions = bommelRepository.findById(24L);

        // Create transaction with bommel
        Transaction withBommel = new Transaction();
        withBommel.setOrganization(org);
        withBommel.setCreatedBy("alice@example.test");
        withBommel.setTotal(BigDecimal.valueOf(50));
        withBommel.setBommel(bommelWithTransactions);
        withBommel.setName("Test Invoice with Bommel");
        transactionRepository.persist(withBommel);

        // Create transaction without bommel (detached)
        Transaction noBommel = new Transaction();
        noBommel.setOrganization(org);
        noBommel.setCreatedBy("alice@example.test");
        noBommel.setTotal(BigDecimal.valueOf(20));
        noBommel.setName("Test Receipt without Bommel");
        transactionRepository.persist(noBommel);
    }

    /**
     * Creates a transaction that satisfies every confirm precondition: amount, date, counterparty and name are set and
     * the amount is exactly covered by a linked bank transaction. Returns its id. Used by the confirm-related tests now
     * that confirming enforces these rules.
     */
    @Transactional
    Long createConfirmableTransaction(BigDecimal total) {
        Organization org = organizationRepository.findById(4L);

        Transaction tx = new Transaction();
        tx.setOrganization(org);
        tx.setCreatedBy("alice@example.test");
        tx.setTotal(total);
        tx.setName("Confirmable Transaction");
        tx.setTransactionTime(Instant.parse("2024-01-01T00:00:00Z"));
        TradeParty counterparty = new TradeParty();
        counterparty.setOrganization(org);
        counterparty.setName("ACME Supplier");
        tx.setCounterparty(counterparty);
        transactionRepository.persist(tx);

        // A bank transaction requires a bank account and an import (both not-null FKs).
        BankAccount bankAccount = new BankAccount();
        bankAccount.setOrganization(org);
        bankAccount.setBommel(bommelRepository.findById(23L));
        bankAccount.setName("Test Account");
        bankAccount.setIban("DE89370400440532013000");
        bankAccount.setCreatedBy("alice@example.test");
        em.persist(bankAccount);

        BankImport bankImport = new BankImport();
        bankImport.setOrganization(org);
        bankImport.setBankAccount(bankAccount);
        bankImport.setFileName("test.csv");
        bankImport.setFileSize(0);
        bankImport.setFileSha256("test-sha-" + total.toPlainString());
        bankImport.setImportedBy("alice@example.test");
        em.persist(bankImport);

        // A bank transaction whose absolute amount exactly covers the transaction, plus the linking match row.
        BankTransaction bankTx = new BankTransaction();
        bankTx.setOrganization(org);
        bankTx.setBankAccount(bankAccount);
        bankTx.setBankImport(bankImport);
        bankTx.setBookingDate(LocalDate.of(2024, 1, 1));
        bankTx.setAmount(total);
        bankTx.setCurrency("EUR");
        bankTx.setDedupeHash("test-cover-" + total.toPlainString());
        em.persist(bankTx);

        BankTransactionMatch match = new BankTransactionMatch();
        match.setBankTransaction(bankTx);
        match.setTransaction(tx);
        match.setMatchedAmount(total.abs());
        match.setMatchType(BankTransactionMatchType.MANUAL);
        match.setMatchedBy("alice@example.test");
        em.persist(match);

        return tx.getId();
    }

    @Test
    void shouldListAllTransactions() {
        given()
                .when()
                .get()
                .then()
                .statusCode(200)
                .body("size()", is(2));
    }

    @Test
    void shouldFetchDetachedTransactions() {
        given()
                .when()
                .queryParam("detached", true)
                .get()
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].total", is(20.0F))
                .body("[0].name", is("Test Receipt without Bommel"));
    }

    @Test
    void shouldFetchTransactionsByBommel() {
        given()
                .when()
                .queryParam("bommelId", 24)
                .get()
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].total", is(50.0F))
                .body("[0].name", is("Test Invoice with Bommel"));
    }

    @Test
    void shouldReturnEmptyListForNonExistentBommel() {
        given()
                .when()
                .queryParam("bommelId", 999)
                .get()
                .then()
                .statusCode(200)
                .body("size()", is(0));
    }

    @Test
    void shouldCreateTransaction() {
        String requestBody = """
                {
                    "name": "New Manual Transaction",
                    "total": 100.50,
                    "privatelyPaid": false
                }
                """;

        given()
                .contentType("application/json")
                .body(requestBody)
                .when()
                .post()
                .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("name", is("New Manual Transaction"))
                .body("total", is(100.50F))
                .body("status", is("DRAFT"));
    }

    @Test
    void shouldGetTransactionById() {
        // First create a transaction to get
        String requestBody = """
                {
                    "name": "Transaction to Get",
                    "total": 75.00,
                    "privatelyPaid": false
                }
                """;

        Integer id = given()
                .contentType("application/json")
                .body(requestBody)
                .when()
                .post()
                .then()
                .statusCode(201)
                .extract()
                .path("id");

        // Now get it by ID
        given()
                .when()
                .get("/{id}", id)
                .then()
                .statusCode(200)
                .body("id", equalTo(id))
                .body("name", is("Transaction to Get"));
    }

    @Test
    void shouldReturn404ForNonExistentTransaction() {
        given()
                .when()
                .get("/{id}", 99999)
                .then()
                .statusCode(404);
    }

    @Test
    void shouldUpdateTransaction() {
        // First create a transaction
        String createBody = """
                {
                    "name": "Original Name",
                    "total": 50.00,
                    "privatelyPaid": false
                }
                """;

        Integer id = given()
                .contentType("application/json")
                .body(createBody)
                .when()
                .post()
                .then()
                .statusCode(201)
                .extract()
                .path("id");

        // Update the transaction
        String updateBody = """
                {
                    "name": "Updated Name",
                    "total": 75.00,
                    "bommelId": 24
                }
                """;

        given()
                .contentType("application/json")
                .body(updateBody)
                .when()
                .patch("/{id}", id)
                .then()
                .statusCode(200)
                .body("id", equalTo(id))
                .body("name", is("Updated Name"))
                .body("total", is(75.0F))
                .body("bommelId", is(24));
    }

    @Test
    void shouldConfirmTransaction() {
        // A transaction may only be confirmed when it is complete and fully covered by bank transactions.
        Long id = createConfirmableTransaction(BigDecimal.valueOf(30));

        given()
                .contentType("application/json")
                .when()
                .post("/{id}/confirm", id)
                .then()
                .statusCode(200)
                .body("id", equalTo(id.intValue()))
                .body("status", is("CONFIRMED"));
    }

    @Test
    void shouldRejectConfirmWhenIncompleteOrUncovered() {
        // A bare draft (no date, no counterparty, no bank coverage) cannot be confirmed.
        String createBody = """
                {
                    "name": "Draft Transaction",
                    "total": 30.00,
                    "privatelyPaid": false
                }
                """;

        Integer id = given()
                .contentType("application/json")
                .body(createBody)
                .when()
                .post()
                .then()
                .statusCode(201)
                .body("status", is("DRAFT"))
                .extract()
                .path("id");

        given()
                .contentType("application/json")
                .when()
                .post("/{id}/confirm", id)
                .then()
                .statusCode(400);

        // It stays a draft.
        given()
                .when()
                .get("/{id}", id)
                .then()
                .statusCode(200)
                .body("status", is("DRAFT"));
    }

    @Test
    void shouldReopenConfirmedTransaction() {
        // Create, confirm, then reopen a fully-confirmable transaction.
        Long id = createConfirmableTransaction(BigDecimal.valueOf(40));

        given()
                .contentType("application/json")
                .when()
                .post("/{id}/confirm", id)
                .then()
                .statusCode(200)
                .body("status", is("CONFIRMED"));

        // Reopen it back to draft
        given()
                .contentType("application/json")
                .when()
                .post("/{id}/reopen", id)
                .then()
                .statusCode(200)
                .body("id", equalTo(id.intValue()))
                .body("status", is("DRAFT"));
    }

    @Test
    void shouldDeleteTransaction() {
        // First create a transaction
        String createBody = """
                {
                    "name": "Transaction to Delete",
                    "total": 25.00,
                    "privatelyPaid": false
                }
                """;

        Integer id = given()
                .contentType("application/json")
                .body(createBody)
                .when()
                .post()
                .then()
                .statusCode(201)
                .extract()
                .path("id");

        // Delete it
        given()
                .when()
                .delete("/{id}", id)
                .then()
                .statusCode(204);

        // Verify it's gone
        given()
                .when()
                .get("/{id}", id)
                .then()
                .statusCode(404);
    }

    @Test
    void shouldFilterByStatus() {
        // Create and confirm a fully-confirmable transaction (in addition to the two drafts from setup).
        Long id = createConfirmableTransaction(BigDecimal.valueOf(40));

        given()
                .contentType("application/json")
                .when()
                .post("/{id}/confirm", id)
                .then()
                .statusCode(200);

        // Filter by CONFIRMED status
        given()
                .when()
                .queryParam("status", "CONFIRMED")
                .get()
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].status", is("CONFIRMED"));

        // Filter by DRAFT status (should only have 2 from setup)
        given()
                .when()
                .queryParam("status", "DRAFT")
                .get()
                .then()
                .statusCode(200)
                .body("size()", is(2));
    }

    protected String getAccessToken(String userName) {
        return keycloakClient.getAccessToken(userName);
    }
}
