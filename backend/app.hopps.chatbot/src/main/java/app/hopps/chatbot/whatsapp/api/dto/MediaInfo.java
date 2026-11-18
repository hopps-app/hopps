package app.hopps.chatbot.whatsapp.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Metadata of an uploaded WhatsApp media object. {@code url} is short-lived and needs the access token.
 */
public record MediaInfo(String id, String url, @JsonProperty("mime_type") String mimeType) {
}
