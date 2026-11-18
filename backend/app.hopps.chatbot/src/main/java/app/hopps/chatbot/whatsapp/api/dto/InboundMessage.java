package app.hopps.chatbot.whatsapp.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * A single message a WhatsApp user sent to the Hopps business number. Depending on {@link #type()} exactly one of
 * {@link #text()}, {@link #image()}, {@link #document()} or {@link #button()} (a quick-reply button of a template
 * message was pressed) is set.
 */
public record InboundMessage(
        String id,
        /* Sender phone number in international format without '+', e.g. 4917612345678 */
        String from,
        String timestamp,
        String type,
        Text text,
        Media image,
        Media document,
        Button button) {

    public record Text(String body) {
    }

    /** The pressed quick-reply button: its label and the payload Hopps put into the template. */
    public record Button(String text, String payload) {
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
