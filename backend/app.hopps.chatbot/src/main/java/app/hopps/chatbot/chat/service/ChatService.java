package app.hopps.chatbot.chat.service;

import app.hopps.chatbot.chat.ai.HoppsAssistant;
import app.hopps.chatbot.chat.model.IncomingChatMessage;
import app.hopps.chatbot.receipt.service.ReceiptIntakeService;
import jakarta.enterprise.context.ApplicationScoped;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Entry point for every chat channel: decides how a message is handled and returns the reply text.
 */
@ApplicationScoped
public class ChatService {

    private static final Logger LOG = LoggerFactory.getLogger(ChatService.class);

    // TODO i18n: pick the language per member once senders are mapped to members.
    static final String REPLY_ASSISTANT_UNAVAILABLE = "Gerade gibt es ein technisches Problem. Bitte später noch einmal versuchen.";

    private final ReceiptIntakeService receiptIntakeService;
    private final HoppsAssistant assistant;

    public ChatService(ReceiptIntakeService receiptIntakeService, HoppsAssistant assistant) {
        this.receiptIntakeService = receiptIntakeService;
        this.assistant = assistant;
    }

    public String handle(IncomingChatMessage message) {
        if (message.hasAttachment()) {
            return receiptIntakeService.handle(message);
        }
        if (!message.hasText()) {
            return ReceiptIntakeService.REPLY_UNSUPPORTED;
        }
        try {
            return assistant.chat(message.conversationId(), message.text());
        } catch (RuntimeException e) {
            LOG.error("Assistant failed for conversation {}", message.conversationId(), e);
            return REPLY_ASSISTANT_UNAVAILABLE;
        }
    }
}
