package app.hopps.organization.api;

import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.organization.service.CurrencyLockedException;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.repository.TransactionRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

/**
 * The organization's currency: EUR by default, switchable to CHF, and frozen as soon as the first transaction exists.
 * Emanuel Urban (member 2) belongs to "Grünes Herz e.V." (organization 2).
 */
@QuarkusTest
@TestHTTPEndpoint(OrganizationResource.class)
@TestSecurity(user = "emanuel_urban@domain.none")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
})
class OrganizationCurrencyResourceTests {

    private static final long ORGANIZATION_ID = 2L;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    TransactionRepository transactionRepository;

    @BeforeEach
    void cleanDatabase() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
        // Start every test from an organization without bookings, so the lock is only ever set on purpose.
        QuarkusTransaction.requiringNew().run(() -> transactionRepository.delete("organization.id", ORGANIZATION_ID));
    }

    @Test
    @DisplayName("defaults to EUR and is not locked while there are no transactions")
    void defaultsToEuroUnlocked() {
        given()
                .when()
                .get("my")
                .then()
                .statusCode(200)
                .body("currency", is("EUR"))
                .body("currencyLocked", is(false));
    }

    @Test
    @DisplayName("can be switched to CHF while there are no transactions")
    void switchesToChfWithoutTransactions() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"currency\": \"CHF\"}")
                .when()
                .put("my")
                .then()
                .statusCode(200)
                .body("currency", is("CHF"))
                .body("currencyLocked", is(false));

        given()
                .when()
                .get("my")
                .then()
                .statusCode(200)
                .body("currency", is("CHF"));
    }

    @Test
    @DisplayName("leaves the currency alone when the update does not mention it")
    void keepsCurrencyWhenOmitted() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"currency\": \"CHF\"}")
                .when()
                .put("my")
                .then()
                .statusCode(200);

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\": \"Grünes Herz e.V.\"}")
                .when()
                .put("my")
                .then()
                .statusCode(200)
                .body("currency", is("CHF"));
    }

    @Test
    @DisplayName("is locked once the first transaction exists")
    void locksAfterFirstTransaction() {
        createTransaction();

        given()
                .when()
                .get("my")
                .then()
                .statusCode(200)
                .body("currency", is("EUR"))
                .body("currencyLocked", is(true));

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"currency\": \"CHF\"}")
                .when()
                .put("my")
                .then()
                .statusCode(409)
                .body("code", is(CurrencyLockedException.CODE));

        // Nothing was changed by the rejected request.
        given()
                .when()
                .get("my")
                .then()
                .statusCode(200)
                .body("currency", is("EUR"));
    }

    @Test
    @DisplayName("still accepts a full-form save that re-sends the unchanged currency while locked")
    void acceptsUnchangedCurrencyWhileLocked() {
        createTransaction();

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\": \"Grünes Herz e.V.\", \"currency\": \"EUR\"}")
                .when()
                .put("my")
                .then()
                .statusCode(200)
                .body("currency", is("EUR"))
                .body("currencyLocked", is(true));
    }

    @Test
    @DisplayName("rejects a currency that is not supported")
    void rejectsUnknownCurrency() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"currency\": \"USD\"}")
                .when()
                .put("my")
                .then()
                .statusCode(400);
    }

    private void createTransaction() {
        QuarkusTransaction.requiringNew().run(() -> {
            Organization organization = organizationRepository.findById(ORGANIZATION_ID);
            Transaction transaction = new Transaction();
            transaction.setOrganization(organization);
            transaction.setCreatedBy("emanuel_urban@domain.none");
            transaction.setName("Mitgliedsbeitrag");
            transaction.setTotal(BigDecimal.valueOf(25));
            transactionRepository.persist(transaction);
        });
    }
}
