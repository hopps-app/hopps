package app.hopps.chatbot.chat.service;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChatCommandsTest {

    @Test
    void findsCodeInPrefilledMessage() {
        assertEquals(Optional.of("ABCDE-FGHJK"), ChatCommands.inviteCode("Hopps-Code: ABCDE-FGHJK"));
        assertEquals(Optional.of("abcdefghjk"), ChatCommands.inviteCode("hopps code abcdefghjk bitte"));
    }

    @Test
    void acceptsBareCodeOnlyWithDigitOrSeparator() {
        assertEquals(Optional.of("ab1de fghjk"), ChatCommands.inviteCode(" ab1de fghjk "));
        assertEquals(Optional.of("ABCDE-FGHJK"), ChatCommands.inviteCode("ABCDE-FGHJK"));
        assertTrue(ChatCommands.inviteCode("Rechnungen").isEmpty());
        assertTrue(ChatCommands.inviteCode("Wie reiche ich einen Beleg ein?").isEmpty());
    }

    @Test
    void recognizesStop() {
        assertTrue(ChatCommands.isStop("STOP"));
        assertTrue(ChatCommands.isStop(" abmelden! "));
        assertFalse(ChatCommands.isStop("stop sending me this"));
        assertFalse(ChatCommands.isStop(null));
    }
}
