package app.hopps.organization.api;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import app.hopps.member.repository.MemberActivityRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class AdminOrganizationResourceTests {

    private static final String PATH = "/admin/organizations";

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    MemberActivityRepository memberActivityRepository;

    @BeforeEach
    void cleanDatabase() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    @Test
    @DisplayName("should reject anonymous access with 401")
    void shouldRejectAnonymous() {
        given()
                .when()
                .get(PATH)
                .then()
                .statusCode(401);
    }

    @Test
    @DisplayName("should reject a non-admin user with 403")
    @TestSecurity(user = "member@example.test", roles = { "user" })
    void shouldRejectNonAdmin() {
        given()
                .when()
                .get(PATH)
                .then()
                .statusCode(403);
    }

    @Test
    @DisplayName("should list all organizations for an admin")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldListOrganizations() {
        given()
                .when()
                .get(PATH)
                .then()
                .statusCode(200)
                .body("$", hasSize(3))
                // every row exposes a non-null createdAt and a contact email (owner falls back to any member)
                .body("createdAt", notNullValue())
                // belegeCount is the number of uploaded documents (Belege): org 4 has 28 seeded, org 2 has none
                .body("find { it.slug == 'buehnefrei-ev' }.belegeCount", is(28))
                .body("find { it.slug == 'buehnefrei-ev' }.contactEmail", notNullValue())
                .body("find { it.slug == 'gruenes-herz-ev' }.belegeCount", is(0))
                // no member has ever been "seen" in the test data
                .body("find { it.slug == 'buehnefrei-ev' }.lastActivityAt", nullValue());
    }

    @Test
    @DisplayName("should return full detail for an organization")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReturnDetail() {
        given()
                .when()
                .get(PATH + "/4")
                .then()
                .statusCode(200)
                .body("id", is(4))
                .body("name", is("Theatervereine Bühnefrei e.V."))
                .body("slug", is("buehnefrei-ev"))
                .body("belegeCount", is(28))
                .body("bankImportCount", is(0))
                .body("members", hasSize(9))
                .body("contactEmail", notNullValue())
                .body("address.city", is("Rietberg"));
    }

    @Test
    @DisplayName("should return 7-day login activity for an organization")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReturnLoginActivity() {
        LocalDate today = LocalDate.now();
        // buehnefrei-ev (org 4) has members 15..23. activityCount is the total activity events (summed activity_count),
        // not distinct members. Today: member 15 twice (-> count 2) + member 16 once (-> count 1) = 3. Yesterday:
        // member 15 once = 1.
        memberActivityRepository.recordActivity("00000000-0000-0000-0000-000000000015", today);
        memberActivityRepository.recordActivity("00000000-0000-0000-0000-000000000015", today);
        memberActivityRepository.recordActivity("00000000-0000-0000-0000-000000000016", today);
        memberActivityRepository.recordActivity("00000000-0000-0000-0000-000000000015", today.minusDays(1));

        given()
                .when()
                .get(PATH + "/4/login-activity")
                .then()
                .statusCode(200)
                .body("totalMembers", is(9))
                .body("days", hasSize(7))
                // oldest first: index 6 = today, 5 = yesterday, 0 = six days ago
                .body("days[6].activityCount", is(3))
                .body("days[5].activityCount", is(1))
                .body("days[0].activityCount", is(0));
    }

    @Test
    @DisplayName("should return 404 for login activity of an unknown organization")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReturn404ForLoginActivityOfUnknownOrg() {
        given()
                .when()
                .get(PATH + "/9999/login-activity")
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("should return 6-month document-upload activity for an organization")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReturnDocumentActivity() {
        // buehnefrei-ev (org 4) seeds documents across the full 6-month window.
        // Per month (monthsAgo): 5m=2, 4m=3, 3m=5, 2m=4, 1m=6, 0m=8.
        given()
                .when()
                .get(PATH + "/4/document-activity")
                .then()
                .statusCode(200)
                .body("months", hasSize(6))
                // oldest first: index 0 = five months ago, index 5 = current month
                .body("months[0].count", is(2))
                .body("months[1].count", is(3))
                .body("months[2].count", is(5))
                .body("months[3].count", is(4))
                .body("months[4].count", is(6))
                .body("months[5].count", is(8));
    }

    @Test
    @DisplayName("should return an all-zero document-upload window for an organization without documents")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReturnEmptyDocumentActivity() {
        // gruenes-herz-ev (org 2) has no seeded documents: every month is reported as zero.
        given()
                .when()
                .get(PATH + "/2/document-activity")
                .then()
                .statusCode(200)
                .body("months", hasSize(6))
                .body("months.count.sum()", is(0));
    }

    @Test
    @DisplayName("should return 404 for document activity of an unknown organization")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReturn404ForDocumentActivityOfUnknownOrg() {
        given()
                .when()
                .get(PATH + "/9999/document-activity")
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("should return 404 for an unknown organization")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReturn404ForUnknown() {
        given()
                .when()
                .get(PATH + "/9999")
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("should soft-delete an organization and then hide it")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldSoftDelete() {
        // delete kaeltekrieger (id 3)
        given()
                .when()
                .delete(PATH + "/3")
                .then()
                .statusCode(204);

        // it is now hidden from the list ...
        given()
                .when()
                .get(PATH)
                .then()
                .statusCode(200)
                .body("$", hasSize(2))
                .body("find { it.slug == 'kaeltekrieger' }", nullValue());

        // ... and from detail
        given()
                .when()
                .get(PATH + "/3")
                .then()
                .statusCode(404);

        // deleting again is a no-op 404 (already soft-deleted)
        given()
                .when()
                .delete(PATH + "/3")
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("should reject soft-delete for a non-admin user")
    @TestSecurity(user = "member@example.test", roles = { "user" })
    void shouldRejectDeleteForNonAdmin() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .when()
                .delete(PATH + "/4")
                .then()
                .statusCode(403);
    }
}
