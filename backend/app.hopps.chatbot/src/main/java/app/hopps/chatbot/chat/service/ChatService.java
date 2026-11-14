package app.hopps.chatbot.chat.service;

import app.hopps.chatbot.chat.ai.HoppsAssistant;
import app.hopps.chatbot.chat.model.IncomingChatMessage;
import app.hopps.chatbot.org.client.dto.OrgConnection;
import app.hopps.chatbot.org.service.OrgGateway;
import app.hopps.chatbot.receipt.service.ReceiptIntakeService;
import jakarta.enterprise.context.ApplicationScoped;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;

/**
 * Entry point for every chat channel: decides how a message is handled and returns the reply text.
 * <ol>
 * <li>STOP disconnects the number.</li>
 * <li>An invite code connects the number to the invite's bommel.</li>
 * <li>A file is filed as a receipt in the connected bommel.</li>
 * <li>Anything else goes to the assistant.</li>
 * </ol>
 */
@ApplicationScoped
public class ChatService {

    private static final Logger LOG = LoggerFactory.getLogger(ChatService.class);

    private final ReceiptIntakeService receiptIntakeService;
    private final HoppsAssistant assistant;
    private final OrgGateway org;

    public ChatService(ReceiptIntakeService receiptIntakeService, HoppsAssistant assistant, OrgGateway org) {
        this.receiptIntakeService = receiptIntakeService;
        this.assistant = assistant;
        this.org = org;
    }

    public String handle(IncomingChatMessage message) {
        try {
            if (!message.hasAttachment() && ChatCommands.isStop(message.text())) {
                return disconnect(message.senderPhoneNumber());
            }
            Optional<String> code = message.hasAttachment() ? Optional.empty()
                    : ChatCommands.inviteCode(message.text());
            if (code.isPresent()) {
                return join(code.get(), message);
            }
            if (message.hasAttachment()) {
                return receiptIntakeService.handle(message);
            }
            if (!message.hasText()) {
                return ChatReplies.UNSUPPORTED_FILE;
            }
            return assistant.chat(message.conversationId(), message.text(),
                    describeConnection(message.senderPhoneNumber()));
        } catch (RuntimeException e) {
            LOG.error("Handling message failed for conversation {}", message.conversationId(), e);
            return ChatReplies.TECHNICAL_PROBLEM;
        }
    }

    private String join(String code, IncomingChatMessage message) {
        OrgGateway.JoinOutcome outcome = org.join(code, message.senderPhoneNumber(), message.senderName());
        LOG.info("Invite code from conversation {}: {}", message.conversationId(), outcome.status());
        return switch (outcome.status()) {
            case CONNECTED -> ChatReplies.joined(outcome.connection());
            case UNKNOWN_CODE -> ChatReplies.UNKNOWN_CODE;
            case EXPIRED -> ChatReplies.EXPIRED_CODE;
            case TOO_MANY_ATTEMPTS -> ChatReplies.TOO_MANY;
        };
    }

    private String disconnect(String phoneNumber) {
        if (org.findConnection(phoneNumber).isEmpty()) {
            return ChatReplies.WAS_NOT_CONNECTED;
        }
        org.disconnect(phoneNumber);
        return ChatReplies.DISCONNECTED;
    }

    /** Context for the assistant; failing to look it up must not cost the user an answer. */
    private String describeConnection(String phoneNumber) {
        try {
            return org.findConnection(phoneNumber)
                    .map(ChatService::describe)
                    .orElse("Diese Nummer ist mit keinem Bommel verbunden. Belege werden erst nach dem Öffnen eines "
                            + "WhatsApp-Einladungslinks aus Hopps angenommen.");
        } catch (RuntimeException e) {
            LOG.warn("Could not look up the connection of a sender: {}", e.getMessage());
            return "Unbekannt.";
        }
    }

    private static String describe(OrgConnection connection) {
        return "Diese Nummer ist mit dem Bommel " + connection.bommelLabel() + " des Vereins "
                + connection.organizationName() + " verbunden. Geschickte Belege landen dort.";
    }
}
