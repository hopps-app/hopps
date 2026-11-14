package app.hopps.chatbot.chat.model;

/**
 * A file the user sent along with a chat message.
 *
 * @param mimeType
 *            e.g. {@code image/jpeg} or {@code application/pdf}
 * @param fileName
 *            original file name, if the channel provides one
 * @param sourceRef
 *            channel-specific handle to fetch the content later, e.g. the WhatsApp media id
 */
public record Attachment(String mimeType, String fileName, String sourceRef) {
}
