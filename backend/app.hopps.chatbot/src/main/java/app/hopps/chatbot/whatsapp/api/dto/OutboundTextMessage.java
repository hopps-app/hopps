package app.hopps.chatbot.whatsapp.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Request body for sending a plain text message through the Graph API {@code /messages} endpoint.
 */
public record OutboundTextMessage(
        @JsonProperty("messaging_product") String messagingProduct,
        @JsonProperty("recipient_type") String recipientType,
        String to,
        String type,
        Text text) {

    public record Text(String body) {
    }

    public static OutboundTextMessage to(String recipient, String body) {
        return new OutboundTextMessage("whatsapp", "individual", recipient, "text", new Text(body));
    }
}
