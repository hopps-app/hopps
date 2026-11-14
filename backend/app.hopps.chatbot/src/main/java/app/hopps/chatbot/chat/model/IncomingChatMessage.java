package app.hopps.chatbot.chat.model;

/**
 * A message from a user, independent of the channel it arrived on.
 *
 * @param conversationId
 *            stable id of the conversation, prefixed with the channel (e.g. {@code whatsapp:4917612345678}); also the
 *            key of the chat memory
 * @param text
 *            message text or caption, may be {@code null}
 * @param attachment
 *            attached file, may be {@code null}
 */
public record IncomingChatMessage(String conversationId, String text, Attachment attachment) {

    public boolean hasAttachment() {
        return attachment != null;
    }

    public boolean hasText() {
        return text != null && !text.isBlank();
    }
}
