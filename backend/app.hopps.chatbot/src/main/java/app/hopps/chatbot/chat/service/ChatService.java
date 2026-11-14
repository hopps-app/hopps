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
 * <li>The Accept/Decline button of an invitation answers it in org.</li>
 * <li>STOP disconnects the number.</li>
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
            Optional<String> accept = ChatCommands.acceptToken(message.action());
            if (accept.isPresent()) {
                return accept(accept.get(), message);
            }
            Optional<String> decline = ChatCommands.declineToken(message.action());
            if (decline.isPresent()) {
                return decline(decline.get(), message);
            }
            if (!message.hasAttachment() && ChatCommands.isStop(message.text())) {
                return disconnect(message.senderPhoneNumber());
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

    private String accept(String token, IncomingChatMessage message) {
        OrgGateway.AnswerOutcome outcome = org.accept(token, message.senderPhoneNumber());
        LOG.info("Invitation accepted in conversation {}: {}", message.conversationId(), outcome.status());
        return switch (outcome.status()) {
            case DONE -> ChatReplies.accepted(outcome.connection());
            case UNKNOWN_INVITATION -> ChatReplies.UNKNOWN_INVITATION;
            case EXPIRED -> ChatReplies.EXPIRED_INVITATION;
        };
    }

    private String decline(String token, IncomingChatMessage message) {
        OrgGateway.AnswerStatus status = org.decline(token, message.senderPhoneNumber());
        LOG.info("Invitation declined in conversation {}: {}", message.conversationId(), status);
        return switch (status) {
            case DONE -> ChatReplies.DECLINED;
            case UNKNOWN_INVITATION -> ChatReplies.UNKNOWN_INVITATION;
            case EXPIRED -> ChatReplies.EXPIRED_INVITATION;
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
                    .orElse("Diese Nummer ist mit keinem Bommel verbunden. Belege werden erst angenommen, nachdem "
                            + "jemand aus dem Verein die Nummer in Hopps eingeladen und sie die Einladung angenommen "
                            + "hat.");
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
