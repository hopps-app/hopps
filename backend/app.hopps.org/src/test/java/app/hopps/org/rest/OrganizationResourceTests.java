package app.hopps.org.rest;

import app.hopps.org.jpa.Organization;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import org.instancio.Instancio;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;

@QuarkusTest
@TestHTTPEndpoint(OrganizationResource.class)
class OrganizationResourceTests {

    @Test
    @DisplayName("should validate valid verein")
    void shouldValidateValidVerein() {

        // given
        Organization organization = Instancio.create(Organization.class);
        organization.setSlug("foobar");
        organization.setId(null);

        RestAssured.given()
                .contentType("application/json")
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

        RestAssured.given()
                .contentType("application/json")
                .body(organization)
                .when()
                .post("/validate")
                .then()
                .statusCode(400)
                .body("violations", hasSize(1))
                .body("violations[0].propertyPath", equalTo("name"))
                .body("violations[0].message", equalTo("must not be blank"));
    }
}
