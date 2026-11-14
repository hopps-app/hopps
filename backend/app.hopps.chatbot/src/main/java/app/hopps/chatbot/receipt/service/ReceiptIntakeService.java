package app.hopps.chatbot.receipt.service;

import app.hopps.chatbot.chat.model.Attachment;
import app.hopps.chatbot.chat.model.IncomingChatMessage;
import jakarta.enterprise.context.ApplicationScoped;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Set;

/**
 * First chatbot use case: members send a photo or PDF of a receipt or invoice, and Hopps files it as a document.
 */
@ApplicationScoped
public class ReceiptIntakeService {

    private static final Logger LOG = LoggerFactory.getLogger(ReceiptIntakeService.class);

    static final Set<String> SUPPORTED_MIME_TYPES = Set.of("image/jpeg", "image/png", "application/pdf");

    // TODO i18n: pick the language per member once senders are mapped to members.
    public static final String REPLY_RECEIVED = "Danke, der Beleg ist angekommen und wird jetzt verarbeitet.";
    public static final String REPLY_UNSUPPORTED = "Bitte ein Foto (JPEG/PNG) oder eine PDF-Datei des Belegs senden.";

    /**
     * Accepts the attachment of the message as a receipt and returns the reply for the user.
     */
    public String handle(IncomingChatMessage message) {
        Attachment attachment = message.attachment();
        if (attachment == null || !SUPPORTED_MIME_TYPES.contains(attachment.mimeType())) {
            LOG.info("No supported receipt attachment in conversation {}: mimeType={}", message.conversationId(),
                    attachment == null ? null : attachment.mimeType());
            return REPLY_UNSUPPORTED;
        }

        LOG.info("Receipt received: conversation={}, source={}, mimeType={}", message.conversationId(),
                attachment.sourceRef(), attachment.mimeType());
        // TODO next steps (see #947):
        // 1. Map the sender to a Hopps member and organization (and reject unknown senders).
        // 2. Fetch the content via the channel (WhatsApp: GET /{version}/{mediaId} -> url, then GET url with token).
        // 3. Upload it to app.hopps.org as a document, which starts the usual ZUGFeRD / AI analysis.
        return REPLY_RECEIVED;
    }
}
