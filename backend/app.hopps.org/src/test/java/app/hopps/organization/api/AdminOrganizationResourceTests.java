package app.hopps.organization.api;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import app.hopps.member.repository.MemberActivityRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.core.MediaType;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
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

    @Inject
    EntityManager entityManager;

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
                // belegeCount is the number of uploaded documents (Belege): org 4 has 33 seeded (28 activity docs +
                // 5 receipts merged from main), org 2 has none
                .body("find { it.slug == 'buehnefrei-ev' }.belegeCount", is(33))
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
                .body("belegeCount", is(33))
                .body("bankImportCount", is(1))
                .body("members", hasSize(9))
                .body("contactEmail", notNullValue())
                .body("address.city", is("Rietberg"));
    }

    @Test
    @DisplayName("should return 7 days of in-app time for an organization, summed across its members")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReturnLoginActivity() {
        LocalDate today = LocalDate.now();
        Instant base = Instant.parse("2026-07-30T09:00:00Z");
        // buehnefrei-ev (org 4) has members 15..23. Each member's first signal only starts their clock; the seconds
        // come from the gaps that follow. Today: member 15 accrues 60s, member 16 accrues 30s, so the organization
        // total is 90s. Yesterday: member 15 alone accrues 120s.
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", today, base);
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", today, base.plusSeconds(60));
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000016", today, base);
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000016", today, base.plusSeconds(30));
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", today.minusDays(1), base);
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", today.minusDays(1),
                base.plusSeconds(120));

        given()
                .when()
                .get(PATH + "/4/login-activity")
                .then()
                .statusCode(200)
                .body("totalMembers", is(9))
                .body("days", hasSize(7))
                // oldest first: index 6 = today, 5 = yesterday, 0 = six days ago
                .body("days[6].activeSeconds", is(90))
                .body("days[5].activeSeconds", is(120))
                .body("days[0].activeSeconds", is(0));
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
        // Per month (monthsAgo): 5m=2, 4m=3, 3m=5, 2m=4, 1m=6, 0m=8 activity docs; the 5 receipts merged from main
        // are created now and fall in the current month, so 0m = 8 + 5 = 13.
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
                .body("months[5].count", is(13));
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
    @DisplayName("should return the all-time extraction-source breakdown for an organization")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReturnExtractionBreakdown() {
        // buehnefrei-ev (org 4) seeds 33 documents (ids 1-5 receipts, 101-128 activity docs), all loaded as MANUAL.
        // Set an explicit mix on twelve of the activity docs: 5 ZUGFERD, 3 AI, 2 MANUAL and 2 back to null (the CASE
        // has no branch for them) to stand for never-analyzed documents. Those two must fold into MANUAL alongside the
        // 21 untouched ones, so MANUAL = 2 + 2 + 21 = 25 and the three source counts sum to the 33 total.
        QuarkusTransaction.requiringNew()
                .run(() -> entityManager.createNativeQuery(
                        "update document set extractionsource = case "
                                + "when id in (101, 102, 103, 104, 105) then 'ZUGFERD' "
                                + "when id in (106, 107, 108) then 'AI' "
                                + "when id in (109, 110) then 'MANUAL' end "
                                + "where id in (101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112)")
                        .executeUpdate());

        given()
                .when()
                .get(PATH + "/4/extraction-breakdown")
                .then()
                .statusCode(200)
                .body("total", is(33))
                .body("counts.ZUGFERD", is(5))
                .body("counts.AI", is(3))
                // 2 explicitly MANUAL + 2 nulled documents folded into MANUAL + 21 untouched
                .body("counts.MANUAL", is(25));
    }

    @Test
    @DisplayName("should return an empty extraction breakdown for an organization without documents")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReturnEmptyExtractionBreakdown() {
        // gruenes-herz-ev (org 2) has no seeded documents: total is zero and no source is present.
        given()
                .when()
                .get(PATH + "/2/extraction-breakdown")
                .then()
                .statusCode(200)
                .body("total", is(0))
                .body("counts.size()", is(0));
    }

    @Test
    @DisplayName("should return 404 for extraction breakdown of an unknown organization")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReturn404ForExtractionBreakdownOfUnknownOrg() {
        given()
                .when()
                .get(PATH + "/9999/extraction-breakdown")
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
