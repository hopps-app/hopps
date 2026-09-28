package app.hopps.transaction.audit;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import app.hopps.audit.domain.AuditAction;
import app.hopps.audit.domain.AuditLog;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.transaction.api.TransactionResource;
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
 * What users change and delete on a transaction ends up in the audit trail, with who did it, and the trail outlives the
 * transaction.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
@TestHTTPEndpoint(TransactionResource.class)
class TransactionAuditTest {

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

    private Long createTransaction(String name, String total) {
        Integer id = given()
                .contentType("application/json")
                .body("""
                        { "name": "%s", "total": %s, "privatelyPaid": false }
                        """.formatted(name, total))
                .when()
                .post()
                .then()
                .statusCode(201)
                .extract()
                .path("id");
        return id.longValue();
    }

    @Test
    void recordsWhoCreatedTheTransaction() {
        Long id = createTransaction("Audited", "12.50");

        List<AuditLog> entries = auditOf(id);

        assertEquals(1, entries.size());
        AuditLog entry = entries.get(0);
        assertEquals(AuditAction.CREATE, entry.action);
        assertEquals("alice@example.test", entry.actorEmail);
        assertEquals("eb4123a3-b722-4798-9af5-8957f823657a", entry.actorKeycloakId);
        // The person itself, so the entry still says who it was once the member is gone.
        assertEquals(21L, entry.actorMemberId);
        assertEquals("Alice Musterfrau", entry.actorName);
        assertEquals(4L, entry.organizationId);
        assertNotNull(entry.occurredAt);
        assertEquals("Audited", entry.snapshot.get("name"));
        assertEquals("12.5", entry.snapshot.get("total"));
        assertNull(entry.changes);
    }

    @Test
    void recordsOnlyTheFieldsAnUpdateChanged() {
        Long id = createTransaction("Before", "50.00");

        given()
                .contentType("application/json")
                .body("""
                        { "name": "After", "total": 50.00, "bommelId": 24 }
                        """)
                .when()
                .patch("/{id}", id)
                .then()
                .statusCode(200);

        List<AuditLog> entries = auditOf(id);

        assertEquals(2, entries.size());
        AuditLog update = entries.get(1);
        assertEquals(AuditAction.UPDATE, update.action);
        assertEquals(Map.of("old", "Before", "new", "After"), update.changes.get("name"));
        assertEquals(24, ((Map<?, ?>) update.changes.get("bommelId")).get("new"));
        // The amount is the same value, so it is not listed.
        assertNull(update.changes.get("total"));
    }

    @Test
    void anUpdateThatChangesNothingLeavesNoEntry() {
        Long id = createTransaction("Same", "20.00");

        given()
                .contentType("application/json")
                .body("""
                        { "name": "Same", "total": 20.00 }
                        """)
                .when()
                .patch("/{id}", id)
                .then()
                .statusCode(200);

        assertEquals(1, auditOf(id).size());
    }

    @Test
    void keepsTheStateOfADeletedTransaction() {
        Long id = createTransaction("Doomed", "99.90");

        given()
                .when()
                .delete("/{id}", id)
                .then()
                .statusCode(204);

        List<AuditLog> entries = auditOf(id);

        assertEquals(List.of(AuditAction.CREATE, AuditAction.DELETE), entries.stream().map(e -> e.action).toList());
        AuditLog deletion = entries.get(1);
        assertEquals("alice@example.test", deletion.actorEmail);
        assertEquals("Doomed", deletion.snapshot.get("name"));
        assertEquals("99.9", deletion.snapshot.get("total"));
        assertEquals(List.of(), deletion.snapshot.get("bankMatches"));
    }

    @Test
    void aFailedRequestLeavesNoEntry() {
        given()
                .contentType("application/json")
                .body("""
                        { "name": "Nope" }
                        """)
                .when()
                .patch("/{id}", 999999)
                .then()
                .statusCode(404);

        assertEquals(0, auditOf(999999L).size());
    }
}
