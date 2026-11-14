package app.hopps.chatbot.receipt.service;

import app.hopps.chatbot.whatsapp.api.dto.InboundMessage;
import app.hopps.chatbot.whatsapp.service.WhatsAppMessenger;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.mockito.Mockito.verify;

class ReceiptIntakeServiceTest {

    private final WhatsAppMessenger messenger = Mockito.mock(WhatsAppMessenger.class);
    private final ReceiptIntakeService service = new ReceiptIntakeService(messenger);

    @Test
    void confirmsPdfDocument() {
        var pdf = new InboundMessage.Media("media-1", "application/pdf", "abc", null, "rechnung.pdf");

        service.handle(new InboundMessage("wamid.1", "4917612345678", "1", "document", null, null, pdf));

        verify(messenger).sendText("4917612345678", ReceiptIntakeService.REPLY_RECEIVED);
    }

    @Test
    void asksForReceiptWhenTextIsSent() {
        var text = new InboundMessage.Text("Hallo");

        service.handle(new InboundMessage("wamid.2", "4917612345678", "1", "text", text, null, null));

        verify(messenger).sendText("4917612345678", ReceiptIntakeService.REPLY_UNSUPPORTED);
    }

    @Test
    void asksForReceiptWhenFileTypeIsUnsupported() {
        var gif = new InboundMessage.Media("media-2", "image/gif", "abc", null, null);

        service.handle(new InboundMessage("wamid.3", "4917612345678", "1", "image", null, gif, null));

        verify(messenger).sendText("4917612345678", ReceiptIntakeService.REPLY_UNSUPPORTED);
    }
}
