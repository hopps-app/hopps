package app.hopps.organization.api;

import app.hopps.member.repository.MemberActivityRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

@QuarkusTest
class AdminDashboardResourceTest {

    private static final String PATH = "/admin/dashboard";

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
    @DisplayName("should report the organization total and the signup window")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReportTotalsAndSignups() {
        given()
                .when()
                .get(PATH)
                .then()
                .statusCode(200)
                .body("totalOrganizations", is(3))
                .body("signupsPerMonth", hasSize(AdminDashboardResource.WINDOW_MONTHS))
                // The window is gap-filled, and the seeded organizations all registered inside it.
                .body("signupsPerMonth.count.sum()", is(3));
    }

    @Test
    @DisplayName("should sum in-app time per day across every organization, gap-filled over the window")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReportDailyActivity() {
        LocalDate today = LocalDate.now();
        Instant base = Instant.parse("2026-07-30T09:00:00Z");
        // Members 15 and 16 both belong to buehnefrei-ev: 60s today plus 30s today, so 90s estate-wide.
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", today, base);
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", today, base.plusSeconds(60));
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000016", today, base);
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000016", today, base.plusSeconds(30));
        // Two days ago, member 15 alone accrues 120s.
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", today.minusDays(2), base);
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", today.minusDays(2),
                base.plusSeconds(120));

        int last = AdminDashboardResource.ACTIVITY_WINDOW_DAYS - 1;
        given()
                .when()
                .get(PATH)
                .then()
                .statusCode(200)
                // Every day of the window is present, including the silent ones.
                .body("activityPerDay", hasSize(AdminDashboardResource.ACTIVITY_WINDOW_DAYS))
                // Oldest first, so the final entry is today.
                .body("activityPerDay[" + last + "].activeSeconds", is(90))
                .body("activityPerDay[" + (last - 2) + "].activeSeconds", is(120))
                .body("activityPerDay[" + (last - 1) + "].activeSeconds", is(0))
                .body("activityPerDay.activeSeconds.sum()", is(210));
    }

    @Test
    @DisplayName("should count an organization once per day however many of its members were active")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldCountDistinctOrganizationsPerDay() {
        LocalDate today = LocalDate.now();
        Instant base = Instant.parse("2026-07-30T09:00:00Z");
        // Members 15 and 16 both belong to buehnefrei-ev, so today is ONE active organization, not two.
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", today, base);
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", today, base.plusSeconds(60));
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000016", today, base);
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000016", today, base.plusSeconds(30));

        int last = AdminDashboardResource.ACTIVITY_WINDOW_DAYS - 1;
        given()
                .when()
                .get(PATH)
                .then()
                .statusCode(200)
                .body("activeOrganizationsPerDay", hasSize(AdminDashboardResource.ACTIVITY_WINDOW_DAYS))
                .body("activeOrganizationsPerDay[" + last + "].count", is(1))
                .body("activeOrganizationsPerDay[" + (last - 1) + "].count", is(0));
    }

    @Test
    @DisplayName("should count an organization once across the window however many days it was active")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldCountDistinctOrganizationsInWindow() {
        LocalDate today = LocalDate.now();
        Instant base = Instant.parse("2026-07-30T09:00:00Z");
        // The same organization active on three separate days. Summing the per-day counts would say 3;
        // distinct-over-the-window is 1, which is what this figure has to report.
        for (int daysAgo = 0; daysAgo < 3; daysAgo++) {
            memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", today.minusDays(daysAgo), base);
            memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", today.minusDays(daysAgo),
                    base.plusSeconds(60));
        }

        given()
                .when()
                .get(PATH)
                .then()
                .statusCode(200)
                .body("activeOrganizationsInWindow", is(1))
                .body("activeOrganizationsPerDay.count.sum()", is(3));
    }

    @Test
    @DisplayName("should exclude activity that falls outside the window")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldIgnoreActivityOutsideTheWindow() {
        Instant base = Instant.parse("2026-07-30T09:00:00Z");
        // Exactly one day before the window opens, derived from the constant so it tracks any change to it.
        LocalDate justOutside = LocalDate.now().minusDays(AdminDashboardResource.ACTIVITY_WINDOW_DAYS);
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", justOutside, base);
        memberActivityRepository.accumulate("00000000-0000-0000-0000-000000000015", justOutside, base.plusSeconds(60));

        given()
                .when()
                .get(PATH)
                .then()
                .statusCode(200)
                .body("activityPerDay.activeSeconds.sum()", is(0));
    }

    @Test
    @DisplayName("should report total Belege with a per-month extraction trend that sums to the total")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReportBelegeAndExtraction() {
        // The estate holds 40 documents (Bühnefrei 33, Kältekrieger 7, Grünes Herz none), all loaded as MANUAL. Give
        // twelve of Bühnefrei's an explicit mix: 5 ZUGFERD, 3 AI, 2 MANUAL and 2 back to null (the CASE has no branch
        // for them) to stand for never-analyzed documents. The nulls fold into MANUAL alongside the 30 untouched
        // documents -> 32, so the three sources still account for every document.
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
                .get(PATH)
                .then()
                .statusCode(200)
                .body("extractionPerMonth", hasSize(AdminDashboardResource.WINDOW_MONTHS))
                // Every month carries a value for every source, so no series has a hole in it. If a source were
                // omitted from a month, this list would come back short.
                .body("extractionPerMonth.counts.ZUGFERD", hasSize(AdminDashboardResource.WINDOW_MONTHS))
                .body("extractionPerMonth.counts.AI", hasSize(AdminDashboardResource.WINDOW_MONTHS))
                .body("extractionPerMonth.counts.MANUAL", hasSize(AdminDashboardResource.WINDOW_MONTHS))
                // The seeded documents all fall inside the 12-month window, so the series still account for every one.
                .body("extractionPerMonth.counts.ZUGFERD.sum()", is(5))
                .body("extractionPerMonth.counts.AI.sum()", is(3))
                .body("extractionPerMonth.counts.MANUAL.sum()", is(32));
    }
}
