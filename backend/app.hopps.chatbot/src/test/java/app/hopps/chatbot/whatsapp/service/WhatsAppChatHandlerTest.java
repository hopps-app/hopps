package app.hopps.chatbot.whatsapp.service;

import app.hopps.chatbot.chat.model.IncomingChatMessage;
import app.hopps.chatbot.chat.service.ChatService;
import app.hopps.chatbot.whatsapp.api.dto.InboundMessage;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsAppChatHandlerTest {

    @Test
    void mapsTextMessage() {
        var message = new InboundMessage("wamid.1", "49176", "1", "text", new InboundMessage.Text("Hallo"), null, null);

        IncomingChatMessage chat = WhatsAppChatHandler.toChatMessage(message);

        assertEquals("whatsapp:49176", chat.conversationId());
        assertEquals("Hallo", chat.text());
        assertNull(chat.attachment());
    }

    @Test
    void mapsDocumentWithCaption() {
        var pdf = new InboundMessage.Media("media-1", "application/pdf", "abc", "Getränke", "rechnung.pdf");
        var message = new InboundMessage("wamid.2", "49176", "1", "document", null, null, pdf);

        IncomingChatMessage chat = WhatsAppChatHandler.toChatMessage(message);

        assertEquals("Getränke", chat.text());
        assertEquals("application/pdf", chat.attachment().mimeType());
        assertEquals("rechnung.pdf", chat.attachment().fileName());
        assertEquals("media-1", chat.attachment().sourceRef());
    }

    @Test
    void sendsReplyToSender() {
        ChatService chatService = Mockito.mock(ChatService.class);
        WhatsAppMessenger messenger = Mockito.mock(WhatsAppMessenger.class);
        when(chatService.handle(any())).thenReturn("Antwort");
        var message = new InboundMessage("wamid.3", "49176", "1", "text", new InboundMessage.Text("Hallo"), null, null);

        new WhatsAppChatHandler(chatService, messenger).handle(message);

        verify(messenger).sendText("49176", "Antwort");
    }
}
