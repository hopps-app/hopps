package app.hopps.chatbot.invitation;

import app.hopps.chatbot.whatsapp.client.WhatsAppGraphClient;
import app.hopps.chatbot.whatsapp.config.WhatsAppConfig;
import app.hopps.chatbot.whatsapp.service.WhatsAppMessenger;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The invitation as WhatsApp template message, in the shape the Graph API expects.
 */
class WhatsAppTemplateTest {

    @Test
    @SuppressWarnings("unchecked")
    void buildsTemplateWithBodyParametersAndQuickReplyPayloads() {
        WhatsAppGraphClient client = Mockito.mock(WhatsAppGraphClient.class);
        WhatsAppConfig config = Mockito.mock(WhatsAppConfig.class);
        when(config.graphApiVersion()).thenReturn("v21.0");
        when(config.phoneNumberId()).thenReturn("123");
        when(config.accessToken()).thenReturn("token");
        when(config.invitationTemplate()).thenReturn("hopps_bommel_invitation");
        when(config.invitationTemplateLanguage()).thenReturn("de");

        new WhatsAppMessenger(client, config).sendInvitationTemplate("4917612345678",
                List.of("Alice", "🍿 Kiosk", "Testverein"), List.of("hopps-accept:t", "hopps-decline:t"));

        ArgumentCaptor<Object> body = ArgumentCaptor.forClass(Object.class);
        verify(client).sendMessage(eq("v21.0"), eq("123"), anyString(), body.capture());
        Map<String, Object> message = (Map<String, Object>) body.getValue();
        assertEquals("template", message.get("type"));
        assertEquals("4917612345678", message.get("to"));
        Map<String, Object> template = (Map<String, Object>) message.get("template");
        assertEquals("hopps_bommel_invitation", template.get("name"));
        List<Map<String, Object>> components = (List<Map<String, Object>>) template.get("components");
        assertEquals(3, components.size());
        assertEquals("🍿 Kiosk",
                ((List<Map<String, Object>>) components.get(0).get("parameters")).get(1).get("text"));
        assertEquals("1", components.get(2).get("index"));
        assertEquals("hopps-decline:t",
                ((List<Map<String, Object>>) components.get(2).get("parameters")).get(0).get("payload"));
    }
}
