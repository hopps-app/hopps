package app.hopps.transaction.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.DocumentType;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import app.hopps.transaction.repository.TransactionRepository;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.keycloak.client.KeycloakTestClient;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
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

    KeycloakTestClient keycloakClient = new KeycloakTestClient();

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
        setupTestData();
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
        withBommel.setDocumentType(DocumentType.INVOICE);
        withBommel.setBommel(bommelWithTransactions);
        withBommel.setName("Test Invoice with Bommel");
        transactionRepository.persist(withBommel);

        // Create transaction without bommel (detached)
        Transaction noBommel = new Transaction();
        noBommel.setOrganization(org);
        noBommel.setCreatedBy("alice@example.test");
        noBommel.setTotal(BigDecimal.valueOf(20));
        noBommel.setDocumentType(DocumentType.RECEIPT);
        noBommel.setName("Test Receipt without Bommel");
        transactionRepository.persist(noBommel);
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
    void shouldFilterByDocumentType() {
        given()
                .when()
                .queryParam("documentType", "INVOICE")
                .get()
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].documentType", is("INVOICE"));
    }

    @Test
    void shouldCreateTransaction() {
        String requestBody = """
                {
                    "name": "New Manual Transaction",
                    "total": 100.50,
                    "documentType": "INVOICE",
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
                    "documentType": "RECEIPT",
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
                    "documentType": "INVOICE",
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
        // First create a draft transaction
        String createBody = """
                {
                    "name": "Draft Transaction",
                    "total": 30.00,
                    "documentType": "INVOICE",
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

        // Confirm the transaction
        given()
                .contentType("application/json")
                .when()
                .post("/{id}/confirm", id)
                .then()
                .statusCode(200)
                .body("id", equalTo(id))
                .body("status", is("CONFIRMED"));
    }

    @Test
    void shouldDeleteTransaction() {
        // First create a transaction
        String createBody = """
                {
                    "name": "Transaction to Delete",
                    "total": 25.00,
                    "documentType": "RECEIPT",
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
        // First create and confirm a transaction
        String createBody = """
                {
                    "name": "Confirmed Transaction",
                    "total": 40.00,
                    "documentType": "INVOICE",
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
