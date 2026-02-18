package app.hopps.organization.api;

import app.hopps.bommel.repository.BommelRepository;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.api.OrganizationResource;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.organization.model.NewOrganizationInput;
import app.hopps.organization.model.OrganizationInput;
import app.hopps.organization.model.OwnerInput;
import io.quarkus.narayana.jta.QuarkusTransaction;
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

import java.net.MalformedURLException;
import java.net.URI;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
@TestSecurity(authorizationEnabled = false)
@TestHTTPEndpoint(OrganizationResource.class)
class OrganizationResourceTests {

    @Inject
    Flyway flyway;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    MemberRepository memberRepository;

    @Inject
    BommelRepository bommelRepository;

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
    @DisplayName("should create organization successfully")
    void shouldCreateOrganization() throws MalformedURLException {
        QuarkusTransaction.begin();
        organizationRepository.deleteAll();
        bommelRepository.deleteAll();
        memberRepository.deleteAll();
        QuarkusTransaction.commit();

        OrganizationInput organizationInput = new OrganizationInput("Schützenverein", "schuetzenverein",
                Organization.TYPE.EINGETRAGENER_VEREIN, URI.create("https://hopps.cloud").toURL(),
                URI.create("https://hopps.cloud").toURL(), null, null, null, null, null, null, null, null);
        OwnerInput ownerInput = new OwnerInput("info@op-paf.de", "Test", "User");
        NewOrganizationInput newOrganizationInput = new NewOrganizationInput(ownerInput, "testPassword",
                organizationInput);

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(newOrganizationInput)
                .when()
                .post()
                .then()
                .statusCode(201)
                .body("slug", equalTo("schuetzenverein"))
                .body("name", equalTo("Schützenverein"))
                .body("id", notNullValue());
    }
}
