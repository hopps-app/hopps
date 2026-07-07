package app.hopps.organization.api;

import app.hopps.bommel.repository.BommelRepository;
import app.hopps.organization.api.OrganizationResource;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
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

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
@TestHTTPEndpoint(OrganizationResource.class)
class OrganizationResourceAuthorizedTests {

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    BommelRepository bommelRepository;

    @BeforeEach
    void cleanDatabase() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    @Test
    @DisplayName("should return Organization of current user")
    @TestSecurity(user = "emanuel_urban@domain.none")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
    })
    void shouldReturnMyOrg() {

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .when()
                .get("my")
                .then()
                .statusCode(200)
                .body("name", is("Grünes Herz e.V."));
    }

    @Test
    @DisplayName("should create an organization for an authenticated user that has none yet")
    @TestSecurity(user = "founder@example.test")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            @Claim(key = "email", value = "founder@example.test"),
            @Claim(key = "given_name", value = "Frieda"),
            @Claim(key = "family_name", value = "Founder")
    })
    void shouldCreateOrganizationForUserWithoutOrg() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\": \"Neuer Verein e.V.\", \"slug\": \"neuer-verein-ev\", \"type\": \"EINGETRAGENER_VEREIN\"}")
                .when()
                .post("my")
                .then()
                .statusCode(201)
                .body("slug", is("neuer-verein-ev"));

        // The organization is now linked to the user (member created from the JWT) and becomes their default.
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .when()
                .get("my")
                .then()
                .statusCode(200)
                .body("slug", is("neuer-verein-ev"));
    }

    @Test
    @DisplayName("should reject creating an organization when the user already has one")
    @TestSecurity(user = "emanuel_urban@domain.none")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
    })
    void shouldRejectSecondOrganization() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\": \"Zweiter Verein e.V.\", \"slug\": \"zweiter-verein-ev\", \"type\": \"EINGETRAGENER_VEREIN\"}")
                .when()
                .post("my")
                .then()
                .statusCode(409);
    }

    @Test
    @DisplayName("should update root bommel name when organization name changes")
    @TestSecurity(user = "emanuel_urban@domain.none")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
    })
    void shouldUpdateRootBommelNameOnOrgNameChange() {

        String newName = "Neuer Vereinsname e.V.";

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\": \"" + newName + "\"}")
                .when()
                .put("my")
                .then()
                .statusCode(200)
                .body("name", is(newName));

        var organization = organizationRepository.findBySlug("gruenes-herz-ev");
        var rootBommel = organization.getRootBommel();
        assertEquals(newName, rootBommel.getName());
    }
}
