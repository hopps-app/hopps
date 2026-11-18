package app.hopps.chatbot.receipt.service;

import app.hopps.chatbot.chat.model.Attachment;
import app.hopps.chatbot.chat.model.IncomingChatMessage;
import app.hopps.chatbot.chat.service.ChatReplies;
import app.hopps.chatbot.org.client.dto.OrgConnection;
import app.hopps.chatbot.org.service.OrgGateway;
import jakarta.enterprise.context.ApplicationScoped;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Optional;
import java.util.Set;

/**
 * Files a photo or PDF as a receipt in the bommel the sender's number is connected to. Org then runs the usual ZUGFeRD
 * / AI analysis.
 */
@ApplicationScoped
public class ReceiptIntakeService {

    private static final Logger LOG = LoggerFactory.getLogger(ReceiptIntakeService.class);

    static final Set<String> SUPPORTED_MIME_TYPES = Set.of("image/jpeg", "image/png", "application/pdf");

    private final OrgGateway org;

    public ReceiptIntakeService(OrgGateway org) {
        this.org = org;
    }

    /**
     * Files the attachment of the message and returns the reply for the user.
     */
    public String handle(IncomingChatMessage message) {
        Attachment attachment = message.attachment();
        if (attachment == null || !SUPPORTED_MIME_TYPES.contains(attachment.mimeType())) {
            LOG.info("No supported receipt attachment in conversation {}: mimeType={}", message.conversationId(),
                    attachment == null ? null : attachment.mimeType());
            return ChatReplies.UNSUPPORTED_FILE;
        }

        // Checked before downloading, so an unknown number costs no media download.
        Optional<OrgConnection> connection = org.findConnection(message.senderPhoneNumber());
        if (connection.isEmpty()) {
            LOG.info("Receipt from unconnected number in conversation {}", message.conversationId());
            return ChatReplies.NOT_CONNECTED;
        }

        byte[] content;
        try {
            content = attachment.content().load();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not load attachment", e);
        }
        OrgGateway.UploadStatus status = org.submitReceipt(message.senderPhoneNumber(), content,
                attachment.fileName(), attachment.mimeType(), message.text());
        LOG.info("Receipt from conversation {}: {}", message.conversationId(), status);
        return switch (status) {
            case FILED -> ChatReplies.receiptFiled(connection.get());
            case NOT_CONNECTED -> ChatReplies.NOT_CONNECTED;
            case DUPLICATE -> ChatReplies.DUPLICATE;
            case UNSUPPORTED -> ChatReplies.UNSUPPORTED_FILE;
            case TOO_MANY_UPLOADS -> ChatReplies.TOO_MANY;
        };
    }
}
