package app.hopps.chatbot.receipt.service;

import app.hopps.chatbot.chat.model.Attachment;
import app.hopps.chatbot.chat.model.IncomingChatMessage;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReceiptIntakeServiceTest {

    private final ReceiptIntakeService service = new ReceiptIntakeService();

    @Test
    void confirmsPdfDocument() {
        var pdf = new Attachment("application/pdf", "rechnung.pdf", "media-1");

        String reply = service.handle(new IncomingChatMessage("whatsapp:4917612345678", null, pdf));

        assertEquals(ReceiptIntakeService.REPLY_RECEIVED, reply);
    }

    @Test
    void asksForReceiptWhenFileTypeIsUnsupported() {
        var gif = new Attachment("image/gif", null, "media-2");

        String reply = service.handle(new IncomingChatMessage("whatsapp:4917612345678", null, gif));

        assertEquals(ReceiptIntakeService.REPLY_UNSUPPORTED, reply);
    }
}
