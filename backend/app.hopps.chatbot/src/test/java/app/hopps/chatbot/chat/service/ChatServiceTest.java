package app.hopps.chatbot.chat.service;

import app.hopps.chatbot.chat.ai.HoppsAssistant;
import app.hopps.chatbot.chat.model.Attachment;
import app.hopps.chatbot.chat.model.IncomingChatMessage;
import app.hopps.chatbot.org.client.dto.OrgConnection;
import app.hopps.chatbot.org.service.OrgGateway;
import app.hopps.chatbot.receipt.service.ReceiptIntakeService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatServiceTest {
    private static final String PHONE = "49176";
    private static final OrgConnection KIOSK = new OrgConnection("Testverein", 24L, "Kiosk", "🍺", null);

    private final HoppsAssistant assistant = Mockito.mock(HoppsAssistant.class);
    private final OrgGateway org = Mockito.mock(OrgGateway.class);
    private final ReceiptIntakeService receipts = Mockito.mock(ReceiptIntakeService.class);
    private final ChatService service = new ChatService(receipts, assistant, org);

    private static IncomingChatMessage text(String text) {
        return new IncomingChatMessage("whatsapp:" + PHONE, PHONE, "Max", text, null, null);
    }

    private static IncomingChatMessage button(String title, String payload) {
        return new IncomingChatMessage("whatsapp:" + PHONE, PHONE, "Max", title, null, payload);
    }

    @Test
    void sendsTextToAssistantWithConnectionAsContext() {
        when(org.findConnection(PHONE)).thenReturn(Optional.of(KIOSK));
        when(assistant.chat(eq("whatsapp:" + PHONE), eq("Wie geht das?"), contains("🍺 Kiosk")))
                .thenReturn("Einfach ein Foto schicken.");

        assertEquals("Einfach ein Foto schicken.", service.handle(text("Wie geht das?")));
    }

    @Test
    void assistantStillAnswersWhenConnectionLookupFails() {
        when(org.findConnection(PHONE)).thenThrow(new RuntimeException("org down"));
        when(assistant.chat(anyString(), anyString(), anyString())).thenReturn("Antwort");

        assertEquals("Antwort", service.handle(text("Hallo")));
    }

    @Test
    void acceptButtonConnectsWithoutAssistant() {
        when(org.accept("tok", PHONE)).thenReturn(new OrgGateway.AnswerOutcome(OrgGateway.AnswerStatus.DONE, KIOSK));

        String reply = service.handle(button("Annehmen", "hopps-accept:tok"));

        assertTrue(reply.startsWith("Verbunden mit 🍺 Kiosk (Testverein)"), reply);
        verify(assistant, never()).chat(anyString(), anyString(), anyString());
    }

    @Test
    void declineButtonDeclines() {
        when(org.decline("tok", PHONE)).thenReturn(OrgGateway.AnswerStatus.DONE);

        assertEquals(ChatReplies.DECLINED, service.handle(button("Ablehnen", "hopps-decline:tok")));
    }

    @Test
    void expiredOrReplacedInvitationIsExplained() {
        when(org.accept(anyString(), anyString()))
                .thenReturn(new OrgGateway.AnswerOutcome(OrgGateway.AnswerStatus.EXPIRED, null));
        assertEquals(ChatReplies.EXPIRED_INVITATION, service.handle(button("Annehmen", "hopps-accept:old")));

        when(org.decline(anyString(), anyString())).thenReturn(OrgGateway.AnswerStatus.UNKNOWN_INVITATION);
        assertEquals(ChatReplies.UNKNOWN_INVITATION, service.handle(button("Ablehnen", "hopps-decline:old")));
    }

    @Test
    void stopDisconnectsConnectedNumber() {
        when(org.findConnection(PHONE)).thenReturn(Optional.of(KIOSK));

        assertEquals(ChatReplies.DISCONNECTED, service.handle(text("STOP")));
        verify(org).disconnect(PHONE);
    }

    @Test
    void stopForUnconnectedNumber() {
        when(org.findConnection(PHONE)).thenReturn(Optional.empty());

        assertEquals(ChatReplies.WAS_NOT_CONNECTED, service.handle(text("stop")));
        verify(org, never()).disconnect(anyString());
    }

    @Test
    void routesAttachmentToReceiptIntake() {
        var message = new IncomingChatMessage("whatsapp:" + PHONE, PHONE, null, "Getränke",
                new Attachment("application/pdf", "r.pdf", () -> new byte[0]), null);
        when(receipts.handle(message)).thenReturn("filed");

        assertEquals("filed", service.handle(message));
    }

    @Test
    void technicalProblemWhenAssistantFails() {
        when(org.findConnection(PHONE)).thenReturn(Optional.empty());
        when(assistant.chat(anyString(), anyString(), anyString())).thenThrow(new RuntimeException("quota"));

        assertEquals(ChatReplies.TECHNICAL_PROBLEM, service.handle(text("Hallo")));
    }
}
