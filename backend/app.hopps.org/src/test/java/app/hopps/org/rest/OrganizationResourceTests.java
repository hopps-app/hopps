package app.hopps.org.rest;

import app.hopps.org.jpa.*;
import app.hopps.org.rest.model.NewOrganizationInput;
import app.hopps.org.rest.model.OrganizationInput;
import app.hopps.org.rest.model.OwnerInput;
import app.hopps.org.rest.model.UpdateOrganizationInput;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.flywaydb.core.Flyway;
import org.instancio.Instancio;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.MalformedURLException;
import java.net.URI;
import java.sql.Date;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.any;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

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
    @Inject
    OrganizationResource organizationResource;

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
        QuarkusTransaction.begin();
        organizationRepository.deleteAll();
        bommelRepository.deleteAll();
        memberRepository.deleteAll();
        QuarkusTransaction.commit();

        OrganizationInput organizationInput = new OrganizationInput("Schützenverein", "schuetzenverein",
                Organization.TYPE.EINGETRAGENER_VEREIN, URI.create("https://hopps.cloud").toURL(),
                URI.create("https://hopps.cloud").toURL(), null);
        OwnerInput ownerInput = new OwnerInput("info@op-paf.de", "Test", "User");
        NewOrganizationInput newOrganizationInput = new NewOrganizationInput(ownerInput, "testPassword",
                organizationInput);

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(newOrganizationInput)
                .when()
                .post()
                .then()
                .statusCode(202)
                .body("id", any(String.class))
                .body("error", nullValue());
    }

    @Test
    void shouldUpdateExistingOrganization(){
        var adr = new Address();
        adr.setCity("city");
        adr.setStreet("street");
        adr.setPlz("45645");
        adr.setNumber("545645");
        adr.setAdditionalLine("additional line");

        var updateOrganizationInput = new UpdateOrganizationInput(
            "test_altered",
            adr,
            new Date(516515616),
            "Test HRG",
            "56156156",
            "5461561561"
        );

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(updateOrganizationInput)
                .when()
                .put("gruenes-herz-ev")
                .then()
                .statusCode(200);

        var org = organizationRepository.findBySlug("gruenes-herz-ev");

        assertEquals(updateOrganizationInput.organizationName(), org.getName());
        assertEquals(updateOrganizationInput.foundationDate(), org.getFoundationDate());
        assertEquals(updateOrganizationInput.registerCourt(), org.getRegistrationCourt());
        assertEquals(updateOrganizationInput.registerNumber(), org.getRegistrationNumber());
        assertEquals(updateOrganizationInput.address(), org.getAddress());
    }

}
