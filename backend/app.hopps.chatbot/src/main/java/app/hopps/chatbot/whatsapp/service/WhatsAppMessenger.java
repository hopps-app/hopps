package app.hopps.chatbot.whatsapp.service;

import app.hopps.chatbot.whatsapp.api.dto.OutboundTextMessage;
import app.hopps.chatbot.whatsapp.client.WhatsAppGraphClient;
import app.hopps.chatbot.whatsapp.config.WhatsAppConfig;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.rest.client.inject.RestClient;

/**
 * Sends replies to WhatsApp users.
 */
@ApplicationScoped
public class WhatsAppMessenger {

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
}
