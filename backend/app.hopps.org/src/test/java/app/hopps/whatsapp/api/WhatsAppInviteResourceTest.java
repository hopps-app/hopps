package app.hopps.whatsapp.api;

import app.hopps.bommel.repository.BommelRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.whatsapp.service.WhatsAppInviteService;
import io.quarkus.narayana.jta.QuarkusTransaction;
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
@TestHTTPEndpoint(WhatsAppInviteResource.class)
class WhatsAppInviteResourceTest {
    // Bommel "Kiosk" of alice's organization; bommel 3 belongs to another organization
    private static final long OWN_BOMMEL = 24;
    private static final long FOREIGN_BOMMEL = 3;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    WhatsAppInviteService inviteService;

    @Inject
    BommelRepository bommelRepository;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    private String createInvite() {
        return given().contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .when()
                .post("/{id}", OWN_BOMMEL)
                .then()
                .statusCode(200)
                .extract()
                .path("code");
    }

    @Test
    void bommelWithoutInviteAnswersNoContent() {
        given().when().get("/{id}", OWN_BOMMEL).then().statusCode(204);
    }

    @Test
    void createsGetsAndRevokesInvite() {
        String code = given().contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .when()
                .post("/{id}", OWN_BOMMEL)
                .then()
                .statusCode(200)
                .body("bommelId", equalTo((int) OWN_BOMMEL))
                .body("code", matchesPattern("[0-9A-Z]{5}-[0-9A-Z]{5}"))
                .body("expired", is(false))
                .body("createdBy", equalTo("alice@example.test"))
                .extract()
                .path("code");

        given().when().get("/{id}", OWN_BOMMEL).then().statusCode(200).body("code", equalTo(code));

        given().when().delete("/{id}", OWN_BOMMEL).then().statusCode(204);
        given().when().get("/{id}", OWN_BOMMEL).then().statusCode(204);
    }

    @Test
    void regeneratingReplacesCodeButKeepsContacts() {
        String first = createInvite();
        QuarkusTransaction.requiringNew().run(() -> inviteService.join(first, "4917612345678", "Max"));

        String second = createInvite();

        org.junit.jupiter.api.Assertions.assertNotEquals(first, second);
        given().when().get("/{id}/contacts", OWN_BOMMEL).then().statusCode(200).body("size()", is(1));
    }

    @Test
    void revokingDisconnectsNumbers() {
        String code = createInvite();
        QuarkusTransaction.requiringNew().run(() -> inviteService.join(code, "4917612345678", "Max"));

        given().when().delete("/{id}", OWN_BOMMEL).then().statusCode(204);

        given().when().get("/{id}/contacts", OWN_BOMMEL).then().statusCode(200).body("size()", is(0));
    }

    @Test
    void listsContactsWithMaskedNumberAndRemovesOne() {
        String code = createInvite();
        QuarkusTransaction.requiringNew().run(() -> inviteService.join(code, "4917612345678", "Max"));

        Integer id = given().when()
                .get("/{id}/contacts", OWN_BOMMEL)
                .then()
                .statusCode(200)
                .body("[0].displayName", equalTo("Max"))
                .body("[0].maskedPhoneNumber", equalTo("••• 5678"))
                .body("[0]", not(hasKey("phoneNumber")))
                .extract()
                .path("[0].id");

        given().when().delete("/{id}/contacts/{contactId}", OWN_BOMMEL, id).then().statusCode(204);
        given().when().get("/{id}/contacts", OWN_BOMMEL).then().body("size()", is(0));
    }

    @Test
    void rejectsExpiryInThePast() {
        given().contentType(MediaType.APPLICATION_JSON)
                .body("{\"expiresAt\":\"" + Instant.now().minus(1, ChronoUnit.DAYS) + "\"}")
                .when()
                .post("/{id}", OWN_BOMMEL)
                .then()
                .statusCode(400);
    }

    @Test
    void foreignBommelIsNotFound() {
        given().when().get("/{id}", FOREIGN_BOMMEL).then().statusCode(404);
        given().contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .when()
                .post("/{id}", FOREIGN_BOMMEL)
                .then()
                .statusCode(404);
        given().when().get("/{id}/contacts", FOREIGN_BOMMEL).then().statusCode(404);
    }
}
