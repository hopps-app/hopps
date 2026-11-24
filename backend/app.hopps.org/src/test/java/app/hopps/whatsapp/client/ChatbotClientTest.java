package app.hopps.whatsapp.client;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The real chatbot client against {@link FakeChatbotApi}: the invitation must reach the chatbot as proper UTF-8,
 * including emojis of bommels.
 */
@QuarkusTest
class ChatbotClientTest {

    @Inject
    @RestClient
    ChatbotClient client;

    @Test
    void sendsEmojiAndUmlautsAsUtf8() {
        client.sendInvitation(new ChatbotInvitation("4917612345678", "Anna", "Jörg", "🍿 Kiosk", "Bühnefrei e.V.",
                "token"));

        String body = new String(FakeChatbotApi.lastBody, StandardCharsets.UTF_8);
        assertTrue(body.contains("🍿 Kiosk"), body);
        assertTrue(body.contains("Jörg"), body);
    }
}
