package app.hopps.organization.api;

import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Impersonation is the most dangerous thing an admin can do, so these tests are mostly about the guards: who may ask,
 * whose identity they may ask for, and whether the attempt is recorded.
 */
@QuarkusTest
class AdminImpersonationTests {

    private static final String PATH = "/admin/organizations";
    /** buehnefrei-ev (org 4) owns members 15..23; gruenes-herz-ev is org 2. */
    private static final long ORG_ID = 4;
    private static final long MEMBER_ID = 15;
    private static final String ADMIN_SUB = "00000000-0000-0000-0000-0000000000ad";

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    EntityManager entityManager;

    @BeforeEach
    void cleanDatabase() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    @Test
    @DisplayName("should reject an anonymous impersonation attempt with 401")
    void shouldRejectAnonymous() {
        given()
                .when()
                .post(PATH + "/" + ORG_ID + "/members/" + MEMBER_ID + "/impersonate")
                .then()
                .statusCode(401);
    }

    @Test
    @DisplayName("should reject a non-admin impersonation attempt with 403")
    @TestSecurity(user = "member@example.test", roles = { "user" })
    void shouldRejectNonAdmin() {
        given()
                .when()
                .post(PATH + "/" + ORG_ID + "/members/" + MEMBER_ID + "/impersonate")
                .then()
                .statusCode(403);

        assertEquals(0L, auditCount());
    }

    @Test
    @DisplayName("should return the member's keycloak id and record the impersonation")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    @OidcSecurity(claims = { @Claim(key = "sub", value = ADMIN_SUB),
            @Claim(key = "email", value = "admin@example.test") })
    void shouldAuthoriseAndRecord() {
        given()
                .when()
                .post(PATH + "/" + ORG_ID + "/members/" + MEMBER_ID + "/impersonate")
                .then()
                .statusCode(200)
                .body("keycloakId", notNullValue())
                .body("email", notNullValue())
                .body("displayName", notNullValue());

        assertEquals(1L, auditCount());
        assertEquals(ADMIN_SUB, singleAuditColumn("actor_keycloak_id"));
        assertEquals("admin@example.test", singleAuditColumn("actor_email"));
        assertEquals(String.valueOf(MEMBER_ID), singleAuditColumn("target_member_id"));
        assertEquals(String.valueOf(ORG_ID), singleAuditColumn("organization_id"));
    }

    @Test
    @DisplayName("should refuse to impersonate a member of a different organization")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    @OidcSecurity(claims = { @Claim(key = "sub", value = ADMIN_SUB) })
    void shouldRefuseMemberOfAnotherOrganization() {
        // Member 15 belongs to org 4, so asking for them via org 2 must not work — otherwise the member id alone
        // would be enough to reach anyone in the system.
        given()
                .when()
                .post(PATH + "/2/members/" + MEMBER_ID + "/impersonate")
                .then()
                .statusCode(404);

        assertEquals(0L, auditCount());
    }

    @Test
    @DisplayName("should return 404 for an unknown organization")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    @OidcSecurity(claims = { @Claim(key = "sub", value = ADMIN_SUB) })
    void shouldReturn404ForUnknownOrganization() {
        given()
                .when()
                .post(PATH + "/9999/members/" + MEMBER_ID + "/impersonate")
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("should refuse a member that has no keycloak account with 409")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    @OidcSecurity(claims = { @Claim(key = "sub", value = ADMIN_SUB) })
    void shouldRefuseMemberWithoutAccount() {
        QuarkusTransaction.requiringNew()
                .run(() -> entityManager.createNativeQuery("update member set keycloak_id = null where id = :id")
                        .setParameter("id", MEMBER_ID)
                        .executeUpdate());

        given()
                .when()
                .post(PATH + "/" + ORG_ID + "/members/" + MEMBER_ID + "/impersonate")
                .then()
                .statusCode(409);

        assertEquals(0L, auditCount());
    }

    @Test
    @DisplayName("should expose the real member id and account flag on the detail view")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldExposeMemberIdOnDetail() {
        // The frontend addresses members by this id; it used to be a positional index, which would have made
        // impersonation target whoever happened to be listed first.
        given()
                .when()
                .get(PATH + "/" + ORG_ID)
                .then()
                .statusCode(200)
                .body("members.find { it.id == " + MEMBER_ID + " }.hasAccount", is(true));
    }

    private long auditCount() {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) entityManager
                        .createNativeQuery("select count(*) from impersonation_audit")
                        .getSingleResult()).longValue());
    }

    private String singleAuditColumn(String column) {
        return QuarkusTransaction.requiringNew()
                .call(() -> String.valueOf(entityManager
                        .createNativeQuery("select " + column + " from impersonation_audit")
                        .getSingleResult()));
    }
}
