package app.hopps.chatbot.chat.debug;

import app.hopps.chatbot.chat.ai.HoppsAssistant;
import app.hopps.chatbot.receipt.service.ReceiptIntakeService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.when;

@QuarkusTest
class DebugChatResourceTest {

    @InjectMock
    HoppsAssistant assistant;

    @Test
    void servesPage() {
        given()
                .when()
                .get("/debug/chat")
                .then()
                .statusCode(200)
                .body(containsString("Hopps Chatbot"));
    }

    @Test
    void answersTextThroughAssistant() {
        when(assistant.chat("debug:c1", "Hallo")).thenReturn("Hallo! Wie kann ich helfen?");

        given()
                .multiPart("conversationId", "c1")
                .multiPart("text", "Hallo")
                .when()
                .post("/debug/chat/messages")
                .then()
                .statusCode(200)
                .body("reply", is("Hallo! Wie kann ich helfen?"));
    }

    @Test
    void acceptsUploadedReceipt() {
        given()
                .multiPart("conversationId", "c2")
                .multiPart("file", "beleg.pdf", "%PDF-1.4".getBytes(StandardCharsets.UTF_8), "application/pdf")
                .when()
                .post("/debug/chat/messages")
                .then()
                .statusCode(200)
                .body("reply", is(ReceiptIntakeService.REPLY_RECEIVED));
    }
}
