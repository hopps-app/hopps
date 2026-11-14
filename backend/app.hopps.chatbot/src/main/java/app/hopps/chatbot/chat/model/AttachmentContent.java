package app.hopps.chatbot.chat.model;

import java.io.IOException;

/**
 * Loads the bytes of an attachment on demand; for WhatsApp this downloads the media from Meta.
 */
@FunctionalInterface
public interface AttachmentContent {
    byte[] load() throws IOException;
}
