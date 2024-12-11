package app.hopps.org.rest;

import app.hopps.org.jpa.Organization;
import app.hopps.org.rest.model.NewOrganizationInput;
import app.hopps.org.rest.model.OrganizationInput;
import app.hopps.org.rest.model.OwnerInput;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.flywaydb.core.Flyway;
import org.instancio.Instancio;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.MalformedURLException;
import java.net.URI;
import java.util.Collections;

import static io.restassured.RestAssured.given;
import static io.restassured.RestAssured.when;
import static org.hamcrest.Matchers.*;

@QuarkusTest
@TestHTTPEndpoint(OrganizationResource.class)
class OrganizationResourceTests {

    @Inject
    Flyway flyway;

    @BeforeEach
    public void cleanDatabase() {
        flyway.clean();
        flyway.migrate();
    }

    @Test
    @DisplayName("should validate valid verein")
    void shouldValidateValidVerein() {

        // given
        Organization organization = Instancio.create(Organization.class);
        organization.setSlug("foobar");
        organization.setId(null);

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(organization)
                .when()
                .post("/validate")
                .then()
                .statusCode(200);
    }

    @Test
    @DisplayName("should invalidate verein without name")
    void shouldInvalidateVereinWithoutName() {

        // given
        Organization organization = Instancio.create(Organization.class);
        organization.setSlug("foobar");
        organization.setId(null);
        organization.setName("");

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(organization)
                .when()
                .post("/validate")
                .then()
                .statusCode(400)
                .body("violations", hasSize(1))
                .body("violations[0].propertyPath", equalTo("name"))
                .body("violations[0].message", equalTo("must not be blank"));
    }

    @Test
    void shouldStartCreatingOrganization() throws MalformedURLException {
        OrganizationInput organizationInput = new OrganizationInput("Schützenverein", "schuetzenverein",
                Organization.TYPE.EINGETRAGENER_VEREIN, URI.create("https://hopps.cloud").toURL(),
                URI.create("https://hopps.cloud").toURL(), null);
        OwnerInput ownerInput = new OwnerInput("info@op-paf.de", "Test", "User");
        NewOrganizationInput newOrganizationInput = new NewOrganizationInput(ownerInput, organizationInput);

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(newOrganizationInput)
                .when()
                .post()
                .then()
                .statusCode(202)
                .body(any(String.class));
    }
}
