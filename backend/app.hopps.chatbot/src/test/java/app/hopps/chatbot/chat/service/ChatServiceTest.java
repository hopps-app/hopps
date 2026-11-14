package app.hopps.chatbot.chat.service;

import app.hopps.chatbot.chat.ai.HoppsAssistant;
import app.hopps.chatbot.chat.model.Attachment;
import app.hopps.chatbot.chat.model.IncomingChatMessage;
import app.hopps.chatbot.receipt.service.ReceiptIntakeService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatServiceTest {

    private final HoppsAssistant assistant = Mockito.mock(HoppsAssistant.class);
    private final ChatService service = new ChatService(new ReceiptIntakeService(), assistant);

    @Test
    void sendsTextToAssistantWithConversationAsMemoryId() {
        when(assistant.chat("whatsapp:49176", "Wie reiche ich einen Beleg ein?"))
                .thenReturn("Einfach ein Foto schicken.");

        String reply = service
                .handle(new IncomingChatMessage("whatsapp:49176", "Wie reiche ich einen Beleg ein?", null));

        assertEquals("Einfach ein Foto schicken.", reply);
    }

    @Test
    void routesAttachmentToReceiptIntakeEvenWithCaption() {
        var pdf = new Attachment("application/pdf", "rechnung.pdf", "media-1");

        String reply = service.handle(new IncomingChatMessage("whatsapp:49176", "Rechnung Getränke", pdf));

        assertEquals(ReceiptIntakeService.REPLY_RECEIVED, reply);
        verify(assistant, never()).chat(anyString(), anyString());
    }

    @Test
    void fallsBackWhenAssistantFails() {
        when(assistant.chat(anyString(), anyString())).thenThrow(new RuntimeException("quota exceeded"));

        String reply = service.handle(new IncomingChatMessage("whatsapp:49176", "Hallo", null));

        assertEquals(ChatService.REPLY_ASSISTANT_UNAVAILABLE, reply);
    }

    @Test
    void asksForReceiptWhenMessageIsEmpty() {
        String reply = service.handle(new IncomingChatMessage("whatsapp:49176", "  ", null));

        assertEquals(ReceiptIntakeService.REPLY_UNSUPPORTED, reply);
        verify(assistant, never()).chat(anyString(), anyString());
    }
}
