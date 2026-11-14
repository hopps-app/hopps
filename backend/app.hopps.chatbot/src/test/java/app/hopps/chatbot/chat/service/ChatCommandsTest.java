package app.hopps.chatbot.chat.service;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChatCommandsTest {

    @Test
    void readsTokensFromButtonPayloads() {
        assertEquals(Optional.of("abc"), ChatCommands.acceptToken("hopps-accept:abc"));
        assertEquals(Optional.of("abc"), ChatCommands.declineToken("hopps-decline:abc"));
        assertTrue(ChatCommands.acceptToken("hopps-decline:abc").isEmpty());
        assertTrue(ChatCommands.acceptToken("hopps-accept:").isEmpty());
        assertTrue(ChatCommands.acceptToken(null).isEmpty());
    }

    @Test
    void recognizesStop() {
        assertTrue(ChatCommands.isStop("STOP"));
        assertTrue(ChatCommands.isStop(" abmelden! "));
        assertFalse(ChatCommands.isStop("stop sending me this"));
        assertFalse(ChatCommands.isStop(null));
    }
}
