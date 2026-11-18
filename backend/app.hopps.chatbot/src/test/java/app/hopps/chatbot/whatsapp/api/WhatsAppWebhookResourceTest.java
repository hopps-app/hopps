package app.hopps.chatbot.whatsapp.api;

import app.hopps.chatbot.whatsapp.config.WhatsAppConfig;
import app.hopps.chatbot.whatsapp.service.WhatsAppChatHandler;
import app.hopps.chatbot.whatsapp.api.dto.InboundMessage;
import app.hopps.chatbot.whatsapp.service.WhatsAppSignatureVerifier;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

@QuarkusTest
class WhatsAppWebhookResourceTest {

    private static final String IMAGE_MESSAGE = """
            {
              "object": "whatsapp_business_account",
              "entry": [{
                "id": "123",
                "changes": [{
                  "field": "messages",
                  "value": {
                    "messaging_product": "whatsapp",
                    "contacts": [{ "wa_id": "4917612345678", "profile": { "name": "Max" } }],
                    "messages": [{
                      "from": "4917612345678",
                      "id": "wamid.1",
                      "timestamp": "1731600000",
                      "type": "image",
                      "image": { "id": "media-1", "mime_type": "image/jpeg", "sha256": "abc" }
                    }]
                  }
                }]
              }]
            }
            """;

    @Inject
    WhatsAppSignatureVerifier signatureVerifier;

    // From config rather than hard-coded: a developer's .env may set a real verify token.
    @Inject
    WhatsAppConfig config;

    @InjectMock
    WhatsAppChatHandler chatHandler;

    @Test
    void verificationEchoesChallengeForCorrectToken() {
        given()
                .queryParam("hub.mode", "subscribe")
                .queryParam("hub.verify_token", config.verifyToken())
                .queryParam("hub.challenge", "42")
                .when()
                .get("/webhooks/whatsapp")
                .then()
                .statusCode(200)
                .body(is("42"));
    }

    @Test
    void verificationFailsForWrongToken() {
        given()
                .queryParam("hub.mode", "subscribe")
                .queryParam("hub.verify_token", "wrong")
                .queryParam("hub.challenge", "42")
                .when()
                .get("/webhooks/whatsapp")
                .then()
                .statusCode(403);
    }

    @Test
    void rejectsUnsignedNotification() {
        given()
                .contentType(ContentType.JSON)
                .body(IMAGE_MESSAGE)
                .when()
                .post("/webhooks/whatsapp")
                .then()
                .statusCode(401);

        verify(chatHandler, never()).handle(any(), any());
    }

    @Test
    void handsSignedMessageToChatHandler() {
        byte[] body = IMAGE_MESSAGE.getBytes(StandardCharsets.UTF_8);

        given()
                .contentType(ContentType.JSON)
                .header("X-Hub-Signature-256", "sha256=" + HexFormat.of().formatHex(signatureVerifier.sign(body)))
                .body(body)
                .when()
                .post("/webhooks/whatsapp")
                .then()
                .statusCode(200);

        ArgumentCaptor<InboundMessage> captor = ArgumentCaptor.forClass(InboundMessage.class);
        verify(chatHandler, timeout(2000)).handle(captor.capture(), eq("Max"));
        InboundMessage message = captor.getValue();
        assertEquals("4917612345678", message.from());
        assertEquals("media-1", message.media().id());
        assertEquals("image/jpeg", message.media().mimeType());
    }
}
