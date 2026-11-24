package app.hopps.chatbot.chat.model;

/**
 * A file the user sent along with a chat message.
 *
 * @param mimeType
 *            e.g. {@code image/jpeg} or {@code application/pdf}
 * @param fileName
 *            original file name; channels without one (WhatsApp photos) get a generated name
 * @param content
 *            loads the bytes when the file is actually filed
 */
public record Attachment(String mimeType, String fileName, AttachmentContent content) {
}
