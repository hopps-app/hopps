package app.hopps.chatbot.whatsapp.service;

import app.hopps.chatbot.chat.model.Attachment;
import app.hopps.chatbot.chat.model.IncomingChatMessage;
import app.hopps.chatbot.chat.service.ChatService;
import app.hopps.chatbot.whatsapp.api.dto.InboundMessage;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Map;

/**
 * Connects WhatsApp to the channel-independent {@link ChatService}: translates the inbound message and sends the reply
 * back to the sender.
 */
@ApplicationScoped
public class WhatsAppChatHandler {

    static final String CONVERSATION_PREFIX = "whatsapp:";
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "application/pdf", ".pdf");

    private final ChatService chatService;
    private final WhatsAppMessenger messenger;
    private final WhatsAppMediaDownloader mediaDownloader;

    public WhatsAppChatHandler(ChatService chatService, WhatsAppMessenger messenger,
            WhatsAppMediaDownloader mediaDownloader) {
        this.chatService = chatService;
        this.messenger = messenger;
        this.mediaDownloader = mediaDownloader;
    }

    /**
     * @param profileName
     *            the sender's WhatsApp profile name from the webhook's contacts, may be null
     */
    public void handle(InboundMessage message, String profileName) {
        String reply = chatService.handle(toChatMessage(message, profileName));
        if (reply != null && !reply.isBlank()) {
            messenger.sendText(message.from(), reply);
        }
    }

    IncomingChatMessage toChatMessage(InboundMessage message, String profileName) {
        String conversationId = CONVERSATION_PREFIX + message.from();
        InboundMessage.Media media = message.media();
        if (message.button() != null) {
            return new IncomingChatMessage(conversationId, message.from(), profileName, message.button().text(), null,
                    message.button().payload());
        }
        if (media == null) {
            String text = message.text() == null ? null : message.text().body();
            return new IncomingChatMessage(conversationId, message.from(), profileName, text, null, null);
        }
        String fileName = media.filename() != null && !media.filename().isBlank() ? media.filename()
                : "whatsapp-" + message.id() + EXTENSIONS.getOrDefault(media.mimeType(), "");
        return new IncomingChatMessage(conversationId, message.from(), profileName, media.caption(),
                new Attachment(media.mimeType(), fileName, () -> mediaDownloader.download(media.id())), null);
    }
}
