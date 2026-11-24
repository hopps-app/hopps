package app.hopps.chatbot.chat.debug;

import app.hopps.chatbot.chat.ai.HoppsAssistant;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * The debug chat end to end through ChatService, with org played by the test app's fake internal API.
 */
@QuarkusTest
class DebugChatResourceTest {
    private static final String PHONE = "4915112345678";

    @InjectMock
    HoppsAssistant assistant;

    @Test
    void servesPage() {
        given()
                .when()
                .get("/debug/chat")
                .then()
                .statusCode(200)
                .body(containsString("hopps Chatbot"));
    }

    @Test
    void answersTextThroughAssistant() {
        when(assistant.chat(eq("debug:c1"), eq("Hallo"), anyString())).thenReturn("Hallo! Wie kann ich helfen?");

        given()
                .multiPart("conversationId", "c1")
                .multiPart("phoneNumber", "4915100000001")
                .multiPart("text", "Hallo")
                .when()
                .post("/debug/chat/messages")
                .then()
                .statusCode(200)
                .body("reply", is("Hallo! Wie kann ich helfen?"));
    }

    @Test
    void invitationShowsUpThenAcceptFilesReceiptThenDisconnects() {
        given().queryParam("phoneNumber", PHONE)
                .when()
                .get("/debug/chat/connection")
                .then()
                .statusCode(200)
                .body("connected", is(false));

        // org sends the invitation; in tests it goes to the debug outbox
        given().header("X-Hopps-Internal-Token", "dev-internal-token")
                .contentType("application/json")
                .body("{\"phoneNumber\":\"" + PHONE + "\",\"recipientName\":\"Max\",\"inviterName\":\"Alice\","
                        + "\"bommelLabel\":\"🍺 Kiosk\",\"organizationName\":\"Testverein\",\"token\":\"valid-token\"}")
                .when()
                .post("/internal/invitations")
                .then()
                .statusCode(204);
        String payload = given().queryParam("phoneNumber", PHONE)
                .when()
                .get("/debug/chat/outbox")
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .extract()
                .path("[0].buttons[0].payload");

        given()
                .multiPart("conversationId", "c2")
                .multiPart("phoneNumber", PHONE)
                .multiPart("text", "Annehmen")
                .multiPart("buttonPayload", payload)
                .when()
                .post("/debug/chat/messages")
                .then()
                .statusCode(200)
                .body("reply", startsWith("Verbunden mit 🍺 Kiosk (Testverein)"));

        given().queryParam("phoneNumber", PHONE)
                .when()
                .get("/debug/chat/connection")
                .then()
                .statusCode(200)
                .body("connected", is(true))
                .body("bommelLabel", is("🍺 Kiosk"));

        given()
                .multiPart("conversationId", "c2")
                .multiPart("phoneNumber", PHONE)
                .multiPart("file", "beleg.pdf", "%PDF-1.4 debug".getBytes(StandardCharsets.UTF_8), "application/pdf")
                .when()
                .post("/debug/chat/messages")
                .then()
                .statusCode(200)
                .body("reply", startsWith("Danke, der Beleg ist bei 🍺 Kiosk angekommen"));

        given()
                .multiPart("conversationId", "c2")
                .multiPart("phoneNumber", PHONE)
                .multiPart("text", "STOP")
                .when()
                .post("/debug/chat/messages")
                .then()
                .statusCode(200)
                .body("reply", startsWith("Diese Nummer ist jetzt von hopps getrennt"));
    }

    @Test
    void receiptFromUnconnectedNumberIsRefused() {
        given()
                .multiPart("conversationId", "c3")
                .multiPart("phoneNumber", "4915100000003")
                .multiPart("file", "beleg.pdf", "%PDF-1.4 other".getBytes(StandardCharsets.UTF_8), "application/pdf")
                .when()
                .post("/debug/chat/messages")
                .then()
                .statusCode(200)
                .body("reply", startsWith("Diese Nummer ist noch mit keinem Bommel verbunden"));
    }

    @Test
    void requiresPhoneNumber() {
        given()
                .multiPart("conversationId", "c4")
                .multiPart("text", "Hallo")
                .when()
                .post("/debug/chat/messages")
                .then()
                .statusCode(400);
    }
}
