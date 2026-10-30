package app.hopps.uploadlink.api;

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
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
@TestSecurity(user = "alice@example.test")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
@TestHTTPEndpoint(UploadLinkResource.class)
class UploadLinkResourceTest {
    // Bommel "Kiosk" of alice's organization; bommel 3 belongs to another organization
    private static final long OWN_BOMMEL = 24;
    private static final long FOREIGN_BOMMEL = 3;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    @Test
    void bommelWithoutLinkAnswersNoContent() {
        given().when().get("/{id}", OWN_BOMMEL).then().statusCode(204);
    }

    @Test
    void createsGetsAndRevokesLink() {
        String token = given().contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .when()
                .post("/{id}", OWN_BOMMEL)
                .then()
                .statusCode(200)
                .body("bommelId", equalTo((int) OWN_BOMMEL))
                .body("token", hasLength(43))
                .body("expiresAt", nullValue())
                .body("expired", is(false))
                .body("createdBy", equalTo("alice@example.test"))
                .extract()
                .path("token");

        given().when().get("/{id}", OWN_BOMMEL).then().statusCode(200).body("token", equalTo(token));

        given().when().delete("/{id}", OWN_BOMMEL).then().statusCode(204);
        given().when().get("/{id}", OWN_BOMMEL).then().statusCode(204);
    }

    @Test
    void regeneratingReplacesTheToken() {
        String first = given().contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .when()
                .post("/{id}", OWN_BOMMEL)
                .then()
                .statusCode(200)
                .extract()
                .path("token");
        String expiresAt = Instant.now().plus(7, ChronoUnit.DAYS).toString();
        String second = given().contentType(MediaType.APPLICATION_JSON)
                .body("{\"expiresAt\":\"" + expiresAt + "\"}")
                .when()
                .post("/{id}", OWN_BOMMEL)
                .then()
                .statusCode(200)
                .body("expiresAt", notNullValue())
                .extract()
                .path("token");

        org.junit.jupiter.api.Assertions.assertNotEquals(first, second);
        given().when().get("/{id}", OWN_BOMMEL).then().body("token", equalTo(second));
    }

    @Test
    void rejectsExpiryInThePast() {
        given().contentType(MediaType.APPLICATION_JSON)
                .body("{\"expiresAt\":\"2020-01-01T00:00:00Z\"}")
                .when()
                .post("/{id}", OWN_BOMMEL)
                .then()
                .statusCode(400);
    }

    @Test
    void bommelOfAnotherOrganizationIsNotFound() {
        given().when().get("/{id}", FOREIGN_BOMMEL).then().statusCode(404);
        given().contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .when()
                .post("/{id}", FOREIGN_BOMMEL)
                .then()
                .statusCode(404);
        given().when().delete("/{id}", FOREIGN_BOMMEL).then().statusCode(404);
    }
}
