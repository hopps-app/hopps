package app.hopps.organization.api;

import app.hopps.bommel.repository.BommelRepository;
import app.hopps.organization.api.OrganizationResource;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
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
    @DisplayName("should update root bommel name when organization name changes")
    @TestSecurity(user = "emanuel_urban@domain.none")
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
