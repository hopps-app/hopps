package app.hopps.organization.api;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

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
                .body("find { it.slug == 'buehnefrei-ev' }.belegeCount", is(15))
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
                .body("belegeCount", is(15))
                .body("bankImportCount", is(0))
                .body("members", hasSize(9))
                .body("contactEmail", notNullValue())
                .body("address.city", is("Rietberg"));
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
