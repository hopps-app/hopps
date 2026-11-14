package app.hopps.chatbot.invitation;

import app.hopps.chatbot.invitation.service.DebugOutbox;
import app.hopps.chatbot.shared.InternalApiFilter;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * org asks the chatbot to send an invitation; in tests the channel is "debug", so it lands in the outbox.
 */
@QuarkusTest
class InternalInvitationResourceTest {
    private static final String PHONE = "4915199999999";
    private static final String BODY = """
            {"phoneNumber":"%s","recipientName":"Anna","inviterName":"Alice Admin",
             "bommelLabel":"🍿 Kiosk","organizationName":"Testverein","token":"tok123"}
            """.formatted(PHONE);

    @Inject
    DebugOutbox outbox;

    @Test
    void requiresInternalToken() {
        given().contentType(ContentType.JSON).body(BODY).when().post("/internal/invitations").then().statusCode(401);
    }

    @Test
    void putsInvitationWithButtonsIntoDebugOutbox() {
        given().header(InternalApiFilter.HEADER, "dev-internal-token")
                .contentType(ContentType.JSON)
                .body(BODY)
                .when()
                .post("/internal/invitations")
                .then()
                .statusCode(204);

        List<DebugOutbox.Message> messages = outbox.take(PHONE);
        assertEquals(1, messages.size());
        assertTrue(messages.get(0).text().startsWith("Einladung von Alice Admin: Belege für 🍿 Kiosk (Testverein)"));
        assertEquals("hopps-accept:tok123", messages.get(0).buttons().get(0).payload());
        assertEquals("hopps-decline:tok123", messages.get(0).buttons().get(1).payload());
        assertTrue(outbox.take(PHONE).isEmpty());
    }
}
