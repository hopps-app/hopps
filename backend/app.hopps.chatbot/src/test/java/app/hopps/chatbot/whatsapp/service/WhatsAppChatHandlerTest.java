package app.hopps.chatbot.whatsapp.service;

import app.hopps.chatbot.chat.model.IncomingChatMessage;
import app.hopps.chatbot.chat.service.ChatService;
import app.hopps.chatbot.whatsapp.api.dto.InboundMessage;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsAppChatHandlerTest {

    private final ChatService chatService = Mockito.mock(ChatService.class);
    private final WhatsAppMessenger messenger = Mockito.mock(WhatsAppMessenger.class);
    private final WhatsAppMediaDownloader downloader = Mockito.mock(WhatsAppMediaDownloader.class);
    private final WhatsAppChatHandler handler = new WhatsAppChatHandler(chatService, messenger, downloader);

    @Test
    void mapsTextMessage() {
        var message = new InboundMessage("wamid.1", "49176", "1", "text", new InboundMessage.Text("Hallo"), null, null,
                null);

        IncomingChatMessage chat = handler.toChatMessage(message, "Max");

        assertEquals("whatsapp:49176", chat.conversationId());
        assertEquals("49176", chat.senderPhoneNumber());
        assertEquals("Max", chat.senderName());
        assertEquals("Hallo", chat.text());
        assertNull(chat.attachment());
    }

    @Test
    void mapsDocumentAndDownloadsLazily() throws Exception {
        var pdf = new InboundMessage.Media("media-1", "application/pdf", "abc", "Getränke", "rechnung.pdf");
        var message = new InboundMessage("wamid.2", "49176", "1", "document", null, null, pdf, null);
        when(downloader.download("media-1")).thenReturn(new byte[] { 1, 2 });

        IncomingChatMessage chat = handler.toChatMessage(message, null);

        assertEquals("Getränke", chat.text());
        assertEquals("rechnung.pdf", chat.attachment().fileName());
        Mockito.verifyNoInteractions(downloader);
        assertArrayEquals(new byte[] { 1, 2 }, chat.attachment().content().load());
    }

    @Test
    void namesPhotosWithoutFileName() {
        var photo = new InboundMessage.Media("media-2", "image/jpeg", "abc", null, null);
        var message = new InboundMessage("wamid.3", "49176", "1", "image", null, photo, null, null);

        assertEquals("whatsapp-wamid.3.jpg", handler.toChatMessage(message, null).attachment().fileName());
    }

    @Test
    void mapsPressedButtonToAction() {
        var message = new InboundMessage("wamid.5", "49176", "1", "button", null, null, null,
                new InboundMessage.Button("Annehmen", "hopps-accept:tok"));

        IncomingChatMessage chat = handler.toChatMessage(message, null);

        assertEquals("hopps-accept:tok", chat.action());
        assertEquals("Annehmen", chat.text());
    }

    @Test
    void sendsReplyToSender() {
        when(chatService.handle(any())).thenReturn("Antwort");
        var message = new InboundMessage("wamid.4", "49176", "1", "text", new InboundMessage.Text("Hallo"), null, null,
                null);

        handler.handle(message, "Max");

        verify(messenger).sendText("49176", "Antwort");
    }
}
