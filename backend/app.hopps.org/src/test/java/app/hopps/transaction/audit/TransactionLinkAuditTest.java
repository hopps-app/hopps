package app.hopps.transaction.audit;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;

import app.hopps.audit.domain.AuditAction;
import app.hopps.audit.domain.AuditLog;
import app.hopps.bankimport.api.BankTransactionResource;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Map;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Linking bank transactions to a transaction, changing how much of one is used and removing the link are recorded on
 * the transaction. The test data has a bank transaction 1 of -125.50 in Alice's organization.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
@TestHTTPEndpoint(BankTransactionResource.class)
class TransactionLinkAuditTest {

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

    @Transactional
    List<AuditLog> auditOf(Long transactionId) {
        return AuditLog.list("entityId = ?1 order by id", transactionId);
    }

    private Long createExpense() {
        Integer id = given()
                .basePath("/transactions")
                .contentType("application/json")
                .body("""
                        { "name": "Office supplies", "total": -125.50, "privatelyPaid": false }
                        """)
                .when()
                .post()
                .then()
                .statusCode(201)
                .extract()
                .path("id");
        return id.longValue();
    }

    private void link(Long transactionId, String body) {
        given()
                .contentType("application/json")
                .body(body)
                .when()
                .post("/{id}/matches", 1)
                .then()
                .statusCode(204);
    }

    private static Map<?, ?> changes(AuditLog entry) {
        return entry.changes;
    }

    @Test
    void recordsALinkWithTheAmountUsed() {
        Long id = createExpense();

        link(id, "{ \"transactionId\": " + id + " }");

        List<AuditLog> entries = auditOf(id);
        assertEquals(List.of(AuditAction.CREATE, AuditAction.LINK), entries.stream().map(e -> e.action).toList());
        AuditLog link = entries.get(1);
        assertEquals("alice@example.test", link.actorEmail);
        assertEquals(1, changes(link).get("bankTransactionId"));
        assertEquals("125.5", changes(link).get("matchedAmount"));
        assertEquals(false, changes(link).get("amountManual"));
    }

    @Test
    void recordsAPartialLinkAndTheChangeOfItsAmount() {
        Long id = createExpense();
        link(id, "{ \"transactionId\": " + id + ", \"amount\": 100.00 }");

        given()
                .contentType("application/json")
                .body("{ \"amount\": 120.00 }")
                .when()
                .patch("/{id}/matches/{transactionId}", 1, id)
                .then()
                .statusCode(204);

        List<AuditLog> entries = auditOf(id);
        assertEquals(List.of(AuditAction.CREATE, AuditAction.LINK, AuditAction.ALLOCATION_UPDATE),
                entries.stream().map(e -> e.action).toList());
        assertEquals(true, changes(entries.get(1)).get("amountManual"));
        assertEquals("100", changes(entries.get(1)).get("matchedAmount"));
        assertEquals(Map.of("old", "100", "new", "120"), changes(entries.get(2)).get("matchedAmount"));
    }

    @Test
    void anAmountThatStaysTheSameLeavesNoEntry() {
        Long id = createExpense();
        link(id, "{ \"transactionId\": " + id + ", \"amount\": 100.00 }");

        given()
                .contentType("application/json")
                .body("{ \"amount\": 100.00 }")
                .when()
                .patch("/{id}/matches/{transactionId}", 1, id)
                .then()
                .statusCode(204);

        assertEquals(2, auditOf(id).size());
    }

    @Test
    void recordsRemovingALink() {
        Long id = createExpense();
        link(id, "{ \"transactionId\": " + id + " }");

        given()
                .when()
                .delete("/{id}/matches/{transactionId}", 1, id)
                .then()
                .statusCode(204);

        List<AuditLog> entries = auditOf(id);
        assertEquals(List.of(AuditAction.CREATE, AuditAction.LINK, AuditAction.UNLINK),
                entries.stream().map(e -> e.action).toList());
        assertEquals(1, changes(entries.get(2)).get("bankTransactionId"));
        assertEquals("125.5", changes(entries.get(2)).get("matchedAmount"));
    }

    @Test
    void aDeletedTransactionKeepsTheLinksItHad() {
        Long id = createExpense();
        link(id, "{ \"transactionId\": " + id + " }");

        given()
                .basePath("/transactions")
                .when()
                .delete("/{id}", id)
                .then()
                .statusCode(204);

        List<AuditLog> entries = auditOf(id);
        AuditLog deletion = entries.get(entries.size() - 1);
        assertEquals(AuditAction.DELETE, deletion.action);
        assertEquals(List.of(Map.of("bankTransactionId", 1, "matchedAmount", "125.5")),
                deletion.snapshot.get("bankMatches"));
    }
}
