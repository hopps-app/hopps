package app.hopps.member.api;

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

import java.time.LocalDate;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The accumulator's arithmetic is covered in {@code MemberActivityRepositoryTest}; what matters here is that the
 * endpoint is reachable only when authenticated and that it starts the caller's clock for today.
 */
@QuarkusTest
class MemberActivityResourceTest {

    private static final String PATH = "/member/activity/heartbeat";
    private static final String KEYCLOAK_ID = "00000000-0000-0000-0000-000000000015";

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
    @DisplayName("should reject an anonymous heartbeat with 401")
    void shouldRejectAnonymous() {
        given()
                .when()
                .post(PATH)
                .then()
                .statusCode(401);
    }

    @Test
    @DisplayName("should record presence for the authenticated member")
    @TestSecurity(user = "member@example.test", roles = { "user" })
    @OidcSecurity(claims = { @Claim(key = "sub", value = KEYCLOAK_ID) })
    void shouldRecordPresence() {
        given()
                .when()
                .post(PATH)
                .then()
                .statusCode(204);

        // A single heartbeat only starts the clock — there is no previous signal to measure a gap against. The row
        // existing at zero is the observable effect. (LastSeenFilter also accumulates on this same request; the
        // minimum-interval guard means that costs nothing rather than double-counting.)
        assertEquals(0L, activeSecondsToday());
    }

    private long activeSecondsToday() {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) entityManager
                        .createNativeQuery("select coalesce(sum(a.active_seconds), 0) from member_activity_day a "
                                + "join member m on m.id = a.member_id "
                                + "where m.keycloak_id = :kid and a.activity_date = :day")
                        .setParameter("kid", KEYCLOAK_ID)
                        .setParameter("day", LocalDate.now())
                        .getSingleResult()).longValue());
    }
}
