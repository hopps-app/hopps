package app.hopps.organization.api;

import app.hopps.shared.tenancy.SingleTenantProfile;
import app.hopps.shared.tenancy.TenancyService;
import app.hopps.shared.security.NoOrganizationAccessException;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.UsersResource;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;

/**
 * The organization API as seen by a self-hosted, single-tenant installation: one initial setup, then invitations only.
 */
@QuarkusTest
@TestProfile(SingleTenantProfile.class)
class SingleTenantOrganizationResourceTest {

    private static final String SETUP_BODY = """
            {
              "owner": {"email": "vorstand@musterverein.test", "firstName": "Maria", "lastName": "Muster"},
              "newPassword": "setupPassword1!",
              "organization": {"name": "Musterverein e.V.", "slug": "musterverein-ev", "type": "EINGETRAGENER_VEREIN"}
            }
            """;

    @Inject
    Flyway flyway;

    @Inject
    Keycloak keycloak;

    @Inject
    @ConfigProperty(name = "app.hopps.org.auth.realm-name")
    String realmName;

    @BeforeEach
    void cleanDatabase() {
        flyway.clean();
        flyway.migrate();
        // The setup provisions a Keycloak account, which outlives the database reset between tests.
        for (String email : List.of("vorstand@musterverein.test", "zweiter@musterverein.test")) {
            UsersResource users = keycloak.realm(realmName).users();
            users.searchByEmail(email, true).forEach(user -> users.delete(user.getId()).close());
        }
    }

    private void setUpOrganization() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(SETUP_BODY)
                .when()
                .post("/organization")
                .then()
                .statusCode(201)
                .body("slug", is("musterverein-ev"));
    }

    @Test
    @DisplayName("reports the pending setup, then the organization once it exists")
    void instanceReflectsSetup() {
        given()
                .when()
                .get("/instance")
                .then()
                .statusCode(200)
                .body("tenancy", is("SINGLE"))
                .body("setupRequired", is(true))
                .body("organizationName", nullValue());

        setUpOrganization();

        given()
                .when()
                .get("/instance")
                .then()
                .statusCode(200)
                .body("tenancy", is("SINGLE"))
                .body("setupRequired", is(false))
                .body("organizationName", is("Musterverein e.V."));
    }

    @Test
    @DisplayName("closes sign-up once the organization exists")
    void signUpClosesAfterSetup() {
        setUpOrganization();

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(SETUP_BODY.replace("musterverein-ev", "zweiter-verein").replace("vorstand@", "zweiter@"))
                .when()
                .post("/organization")
                .then()
                .statusCode(403)
                .body("code", is(TenancyService.SETUP_COMPLETE));
    }

    @Test
    @DisplayName("never lets a logged-in user create an organization of their own")
    @TestSecurity(user = "someone@example.test")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "11111111-2222-3333-4444-555555555555"),
            @Claim(key = "email", value = "someone@example.test")
    })
    void noSelfServiceOrganizations() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\": \"Eigener Verein\", \"slug\": \"eigener-verein\", \"type\": \"EINGETRAGENER_VEREIN\"}")
                .when()
                .post("/organization/my")
                .then()
                .statusCode(403)
                .body("code", is(TenancyService.SINGLE_TENANT));
    }

    @Test
    @DisplayName("tells a logged-in account without a membership that it has no access")
    @TestSecurity(user = "stranger@example.test")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "99999999-9999-9999-9999-999999999999"),
            @Claim(key = "email", value = "stranger@example.test")
    })
    void strangerHasNoAccess() {
        given()
                .when()
                .get("/organization/my")
                .then()
                .statusCode(403)
                .body("code", is(NoOrganizationAccessException.CODE));
    }

    @Test
    @DisplayName("hides the SaaS-only admin API")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void adminApiIsGone() {
        given()
                .when()
                .get("/admin/organizations")
                .then()
                .statusCode(404);

        given()
                .when()
                .get("/admin/dashboard")
                .then()
                .statusCode(404);
    }
}
