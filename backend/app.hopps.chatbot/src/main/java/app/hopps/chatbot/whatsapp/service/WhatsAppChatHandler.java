package app.hopps.chatbot.whatsapp.service;

import app.hopps.chatbot.chat.model.Attachment;
import app.hopps.chatbot.chat.model.IncomingChatMessage;
import app.hopps.chatbot.chat.service.ChatService;
import app.hopps.chatbot.whatsapp.api.dto.InboundMessage;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Connects WhatsApp to the channel-independent {@link ChatService}: translates the inbound message and sends the reply
 * back to the sender.
 */
@ApplicationScoped
public class WhatsAppChatHandler {

    static final String CONVERSATION_PREFIX = "whatsapp:";

    private final ChatService chatService;
    private final WhatsAppMessenger messenger;

    public WhatsAppChatHandler(ChatService chatService, WhatsAppMessenger messenger) {
        this.chatService = chatService;
        this.messenger = messenger;
    }

    public void handle(InboundMessage message) {
        String reply = chatService.handle(toChatMessage(message));
        if (reply != null && !reply.isBlank()) {
            messenger.sendText(message.from(), reply);
        }
    }

    static IncomingChatMessage toChatMessage(InboundMessage message) {
        InboundMessage.Media media = message.media();
        if (media == null) {
            String text = message.text() == null ? null : message.text().body();
            return new IncomingChatMessage(CONVERSATION_PREFIX + message.from(), text, null);
        }
        return new IncomingChatMessage(CONVERSATION_PREFIX + message.from(), media.caption(),
                new Attachment(media.mimeType(), media.filename(), media.id()));
    }
}
