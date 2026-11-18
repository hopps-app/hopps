package app.hopps.chatbot.whatsapp.service;

import app.hopps.chatbot.whatsapp.api.dto.OutboundTextMessage;
import app.hopps.chatbot.whatsapp.client.WhatsAppGraphClient;
import app.hopps.chatbot.whatsapp.config.WhatsAppConfig;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sends messages to WhatsApp users: replies as plain text, invitations as approved template messages (the only kind
 * WhatsApp allows to start a conversation).
 */
@ApplicationScoped
public class WhatsAppMessenger {
    private static final Logger LOG = LoggerFactory.getLogger(WhatsAppMessenger.class);

    private final WhatsAppGraphClient client;
    private final WhatsAppConfig config;

    public WhatsAppMessenger(@RestClient WhatsAppGraphClient client, WhatsAppConfig config) {
        this.client = client;
        this.config = config;
    }

    public void sendText(String recipient, String body) {
        client.sendMessage(config.graphApiVersion(), config.phoneNumberId(), "Bearer " + config.accessToken(),
                OutboundTextMessage.to(recipient, body));
    }

    /**
     * Sends the invitation template.
     *
     * @param bodyParameters
     *            values of {{1}}, {{2}}, … in the template body
     * @param buttonPayloads
     *            payloads of the template's quick-reply buttons, in order
     */
    public void sendInvitationTemplate(String recipient, List<String> bodyParameters, List<String> buttonPayloads) {
        List<Object> components = new ArrayList<>();
        components.add(Map.of("type", "body", "parameters",
                bodyParameters.stream().map(text -> Map.of("type", "text", "text", text)).toList()));
        for (int i = 0; i < buttonPayloads.size(); i++) {
            components.add(Map.of("type", "button", "sub_type", "quick_reply", "index", String.valueOf(i),
                    "parameters", List.of(Map.of("type", "payload", "payload", buttonPayloads.get(i)))));
        }
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("messaging_product", "whatsapp");
        message.put("recipient_type", "individual");
        message.put("to", recipient);
        message.put("type", "template");
        message.put("template", Map.of(
                "name", config.invitationTemplate(),
                "language", Map.of("code", config.invitationTemplateLanguage()),
                "components", components));
        try {
            client.sendMessage(config.graphApiVersion(), config.phoneNumberId(), "Bearer " + config.accessToken(),
                    message);
        } catch (WebApplicationException e) {
            // Template unknown or not approved, recipient not allowed, …: org turns this into "could not be sent".
            // Meta's error body says which; it holds no secrets.
            LOG.warn("WhatsApp rejected the invitation template '{}': HTTP {} {}", config.invitationTemplate(),
                    e.getResponse().getStatus(), errorBody(e));
            throw new WebApplicationException("WhatsApp rejected the invitation: HTTP " + e.getResponse().getStatus(),
                    Response.Status.BAD_GATEWAY);
        }
    }

    private static String errorBody(WebApplicationException e) {
        try {
            return e.getResponse().readEntity(String.class);
        } catch (RuntimeException ignored) {
            return "(no body)";
        }
    }
}
