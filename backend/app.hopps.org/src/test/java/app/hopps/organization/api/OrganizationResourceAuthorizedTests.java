package app.hopps.organization.api;

import app.hopps.organization.api.OrganizationResource;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

@QuarkusTest
@TestHTTPEndpoint(OrganizationResource.class)
class OrganizationResourceAuthorizedTests {

    @Inject
    Flyway flyway;

    @BeforeEach
    void cleanDatabase() {
        flyway.clean();
        flyway.migrate();
    }

    @Test
    @DisplayName("should return Organization of current user")
    @TestSecurity(user = "emanuel_urban@domain.none")
    void shouldReturnMyOrg() {

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .when()
                .get("my")
                .then()
                .statusCode(200)
                .body("name", is("Grünes Herz e.V."));
    }
}
