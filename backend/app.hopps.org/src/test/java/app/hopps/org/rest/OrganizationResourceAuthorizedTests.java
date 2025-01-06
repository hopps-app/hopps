package app.hopps.org.rest;

import app.hopps.org.jpa.Organization;
import app.hopps.org.jpa.OrganizationRepository;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.flywaydb.core.Flyway;
import org.instancio.Instancio;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.SQLException;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.slf4j.LoggerFactory.getLogger;

@QuarkusTest
@TestHTTPEndpoint(OrganizationResource.class)
class OrganizationResourceAuthorizedTests {

    @Inject
    Flyway flyway;

    @BeforeEach
    public void cleanDatabase() throws Exception {
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
