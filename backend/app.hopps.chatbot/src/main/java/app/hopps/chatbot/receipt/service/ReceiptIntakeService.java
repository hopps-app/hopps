package app.hopps.chatbot.receipt.service;

import app.hopps.chatbot.whatsapp.api.dto.InboundMessage;
import app.hopps.chatbot.whatsapp.service.WhatsAppMessenger;
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
    static final String REPLY_RECEIVED = "Danke, der Beleg ist angekommen und wird jetzt verarbeitet.";
    static final String REPLY_UNSUPPORTED = "Bitte ein Foto (JPEG/PNG) oder eine PDF-Datei des Belegs senden.";

    private final WhatsAppMessenger messenger;

    public ReceiptIntakeService(WhatsAppMessenger messenger) {
        this.messenger = messenger;
    }

    public void handle(InboundMessage message) {
        InboundMessage.Media media = message.media();
        if (media == null || !SUPPORTED_MIME_TYPES.contains(media.mimeType())) {
            LOG.info("WhatsApp message {} has no supported receipt attachment: type={}", message.id(), message.type());
            messenger.sendText(message.from(), REPLY_UNSUPPORTED);
            return;
        }

        LOG.info("Receipt received via WhatsApp: messageId={}, mediaId={}, mimeType={}", message.id(), media.id(),
                media.mimeType());
        // TODO next steps:
        // 1. Map the sender phone number to a Hopps member and organization (and reject unknown numbers).
        // 2. Download the media from the Graph API (GET /{version}/{mediaId} -> url, then GET url with the token).
        // 3. Upload it to app.hopps.org as a document, which starts the usual ZUGFeRD / AI analysis.
        messenger.sendText(message.from(), REPLY_RECEIVED);
    }
}
