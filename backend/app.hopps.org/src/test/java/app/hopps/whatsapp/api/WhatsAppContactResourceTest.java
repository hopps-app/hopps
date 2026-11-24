package app.hopps.whatsapp.api;

import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.whatsapp.client.ChatbotClient;
import app.hopps.whatsapp.client.ChatbotInvitation;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.ProcessingException;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@QuarkusTest
@TestSecurity(user = "alice@example.test")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
@TestHTTPEndpoint(WhatsAppContactResource.class)
class WhatsAppContactResourceTest {
    // Bommel "Kiosk" of alice's organization; bommel 3 belongs to another organization
    private static final long OWN_BOMMEL = 24;
    private static final long FOREIGN_BOMMEL = 3;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @InjectMock
    @RestClient
    ChatbotClient chatbotClient;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    private Integer invite(String name, String phone) {
        return given().contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\":\"" + name + "\",\"phoneNumber\":\"" + phone + "\"}")
                .when()
                .post("", OWN_BOMMEL)
                .then()
                .statusCode(200)
                .extract()
                .path("id");
    }

    @Test
    void invitingSendsInvitationAndListsContact() {
        given().contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\":\"Anna Müller\",\"phoneNumber\":\"+49 176 1234 5678\"}")
                .when()
                .post("", OWN_BOMMEL)
                .then()
                .statusCode(200)
                .body("name", equalTo("Anna Müller"))
                .body("maskedPhoneNumber", equalTo("••• 5678"))
                .body("status", equalTo("INVITED"))
                .body("invitationExpired", is(false))
                .body("invitedBy", equalTo("alice@example.test"))
                .body("$", not(hasKey("phoneNumber")));

        ArgumentCaptor<ChatbotInvitation> sent = ArgumentCaptor.forClass(ChatbotInvitation.class);
        verify(chatbotClient).sendInvitation(sent.capture());
        assertEquals("4917612345678", sent.getValue().phoneNumber());
        assertEquals("Anna Müller", sent.getValue().recipientName());
        assertEquals(32, sent.getValue().token().length());

        given().when()
                .get("", OWN_BOMMEL)
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].status", equalTo("INVITED"));
    }

    @Test
    void rejectsNumberWithoutCountryCodeAndMissingName() {
        given().contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\":\"Anna\",\"phoneNumber\":\"0176 12345678\"}")
                .when()
                .post("", OWN_BOMMEL)
                .then()
                .statusCode(400);
        given().contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\":\" \",\"phoneNumber\":\"+4917612345678\"}")
                .when()
                .post("", OWN_BOMMEL)
                .then()
                .statusCode(400);
        verify(chatbotClient, never()).sendInvitation(any());
    }

    @Test
    void failedSendingStoresNothing() {
        doThrow(new ProcessingException("chatbot down")).when(chatbotClient).sendInvitation(any());

        given().contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\":\"Anna\",\"phoneNumber\":\"+4917612345678\"}")
                .when()
                .post("", OWN_BOMMEL)
                .then()
                .statusCode(503);

        given().when().get("", OWN_BOMMEL).then().body("size()", is(0));
    }

    @Test
    void resendReplacesToken() {
        Integer id = invite("Anna", "+4917612345678");

        given().when()
                .post("/{contactId}/resend", OWN_BOMMEL, id)
                .then()
                .statusCode(200)
                .body("status", equalTo("INVITED"));

        ArgumentCaptor<ChatbotInvitation> sent = ArgumentCaptor.forClass(ChatbotInvitation.class);
        verify(chatbotClient, times(2)).sendInvitation(sent.capture());
        assertNotEquals(sent.getAllValues().get(0).token(), sent.getAllValues().get(1).token());
        given().when().get("", OWN_BOMMEL).then().body("size()", is(1));
    }

    @Test
    void removesContact() {
        Integer id = invite("Anna", "+4917612345678");

        given().when().delete("/{contactId}", OWN_BOMMEL, id).then().statusCode(204);

        given().when().get("", OWN_BOMMEL).then().body("size()", is(0));
    }

    @Test
    void foreignBommelIsNotFound() {
        given().when().get("", FOREIGN_BOMMEL).then().statusCode(404);
        given().contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\":\"Anna\",\"phoneNumber\":\"+4917612345678\"}")
                .when()
                .post("", FOREIGN_BOMMEL)
                .then()
                .statusCode(404);
    }
}
