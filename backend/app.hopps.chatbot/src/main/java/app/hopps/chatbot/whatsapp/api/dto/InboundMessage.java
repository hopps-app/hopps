package app.hopps.chatbot.whatsapp.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * A single message a WhatsApp user sent to the Hopps business number. Depending on {@link #type()} exactly one of
 * {@link #text()}, {@link #image()} or {@link #document()} is set.
 */
public record InboundMessage(
        String id,
        /* Sender phone number in international format without '+', e.g. 4917612345678 */
        String from,
        String timestamp,
        String type,
        Text text,
        Media image,
        Media document) {

    public record Text(String body) {
    }

    public record Media(
            String id,
            @JsonProperty("mime_type") String mimeType,
            String sha256,
            String caption,
            /* only set for documents */
            String filename) {
    }

    /** Returns the attached image or document, or {@code null} for messages without media. */
    public Media media() {
        return switch (type == null ? "" : type) {
            case "image" -> image;
            case "document" -> document;
            default -> null;
        };
    }
}
