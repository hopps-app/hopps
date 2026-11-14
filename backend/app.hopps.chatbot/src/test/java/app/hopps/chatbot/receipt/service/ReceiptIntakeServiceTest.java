package app.hopps.chatbot.receipt.service;

import app.hopps.chatbot.chat.model.Attachment;
import app.hopps.chatbot.chat.model.AttachmentContent;
import app.hopps.chatbot.chat.model.IncomingChatMessage;
import app.hopps.chatbot.chat.service.ChatReplies;
import app.hopps.chatbot.org.client.dto.OrgConnection;
import app.hopps.chatbot.org.service.OrgGateway;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReceiptIntakeServiceTest {
    private static final String PHONE = "49176";
    private static final OrgConnection KIOSK = new OrgConnection("Testverein", 24L, "Kiosk", "🍺", null);
    private static final byte[] PDF = "%PDF-1.4".getBytes();

    private final OrgGateway org = Mockito.mock(OrgGateway.class);
    private final ReceiptIntakeService service = new ReceiptIntakeService(org);

    private static IncomingChatMessage message(String mimeType, AttachmentContent content) {
        return new IncomingChatMessage("whatsapp:" + PHONE, PHONE, "Max", "Getränke",
                new Attachment(mimeType, "rechnung.pdf", content), null);
    }

    @Test
    void filesReceiptInConnectedBommel() {
        when(org.findConnection(PHONE)).thenReturn(Optional.of(KIOSK));
        when(org.submitReceipt(PHONE, PDF, "rechnung.pdf", "application/pdf", "Getränke"))
                .thenReturn(OrgGateway.UploadStatus.FILED);

        assertEquals(ChatReplies.receiptFiled(KIOSK), service.handle(message("application/pdf", () -> PDF)));
    }

    @Test
    void unconnectedNumberDoesNotDownload() {
        when(org.findConnection(PHONE)).thenReturn(Optional.empty());
        AttachmentContent content = Mockito.mock(AttachmentContent.class);

        assertEquals(ChatReplies.NOT_CONNECTED, service.handle(message("application/pdf", content)));
        verify(org, never()).submitReceipt(anyString(), any(), anyString(), anyString(), any());
        Mockito.verifyNoInteractions(content);
    }

    @Test
    void duplicateIsReported() {
        when(org.findConnection(PHONE)).thenReturn(Optional.of(KIOSK));
        when(org.submitReceipt(anyString(), any(), anyString(), anyString(), any()))
                .thenReturn(OrgGateway.UploadStatus.DUPLICATE);

        assertEquals(ChatReplies.DUPLICATE, service.handle(message("application/pdf", () -> PDF)));
    }

    @Test
    void unsupportedTypeIsRejectedBeforeAnyCall() {
        assertEquals(ChatReplies.UNSUPPORTED_FILE, service.handle(message("image/gif", () -> PDF)));
        Mockito.verifyNoInteractions(org);
    }
}
