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

        Organization org = organizationRepository.findBySlug("gruenes-herz-ev");
        Address adr = org.getAddress();

        // alter adress
        adr.setCity(adr.getCity() + "_altered");
        adr.setNumber(adr.getNumber() + 1);
        adr.setPlz(adr.getPlz() + "_altered");
        adr.setStreet(adr.getStreet() + "_altered");
        adr.setAdditionalLine(adr.getAdditionalLine() + "_altered");

        //alter Organization
        org.setName(org.getName() + "_altered");
        org.setAddress(adr);
        org.setFoundationDate(new Date(System.currentTimeMillis()));
        org.setRegistrationCourt(org.getRegistrationCourt() + "_altered");
        org.setRegistrationNumber(org.getRegistrationNumber() + "_altered");
        org.setTaxId(org.getTaxId() + "_altered");

        UpdateOrganizationInput updateOrganizationInput = new UpdateOrganizationInput(
            org.getName(),
            org.getAddress(),
            org.getFoundationDate(),
            org.getRegistrationCourt(),
            org.getRegistrationNumber(),
            org.getTaxId()
        );

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(updateOrganizationInput)
                .when()
                .put("/organizations/gruenes-herz-ev")
                .then()
                .statusCode(200);

        assert(organizationRepository.findBySlug("gruenes-herz-ev").equals(org));

    }

}
