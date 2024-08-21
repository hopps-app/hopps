package app.hopps.vereine.rest;

import app.hopps.vereine.jpa.Verein;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import org.instancio.Instancio;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;

@QuarkusTest
@TestHTTPEndpoint(VereinResource.class)
class VereinResourceTests {

    @Test
    @DisplayName("should validate valid verein")
    void shouldValidateValidVerein() {

        // given
        Verein verein = Instancio.create(Verein.class);
        verein.setSlug("foobar");
        verein.setId(null);

        RestAssured.given()
                .contentType("application/json")
                .body(verein)
                .when()
                .post("/validate")
                .then()
                .statusCode(200);
    }

    @Test
    @DisplayName("should invalidate verein without name")
    void shouldInvalidateVereinWithoutName() {

        // given
        Verein verein = Instancio.create(Verein.class);
        verein.setSlug("foobar");
        verein.setId(null);
        verein.setName("");

        RestAssured.given()
                .contentType("application/json")
                .body(verein)
                .when()
                .post("/validate")
                .then()
                .statusCode(400)
                .body("violations", hasSize(1))
                .body("violations[0].propertyPath", equalTo("name"))
                .body("violations[0].message", equalTo("must not be blank"));
    }
}
