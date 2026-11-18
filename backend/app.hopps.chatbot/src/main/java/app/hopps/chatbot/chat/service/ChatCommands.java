package app.hopps.chatbot.chat.service;

import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Messages the bot handles without the LLM: the buttons of an invitation and the request to disconnect.
 */
public final class ChatCommands {
    public static final String ACCEPT_PREFIX = "hopps-accept:";
    public static final String DECLINE_PREFIX = "hopps-decline:";
    private static final Set<String> STOP_WORDS = Set.of("stop", "stopp", "abmelden", "unsubscribe");

    private ChatCommands() {
    }

    static boolean isStop(String text) {
        return text != null && STOP_WORDS.contains(text.strip().toLowerCase(Locale.ROOT).replaceAll("[.!]+$", ""));
    }

    /** The invitation token of an Accept button payload. */
    static Optional<String> acceptToken(String action) {
        return tokenAfter(action, ACCEPT_PREFIX);
    }

    /** The invitation token of a Decline button payload. */
    static Optional<String> declineToken(String action) {
        return tokenAfter(action, DECLINE_PREFIX);
    }

    private static Optional<String> tokenAfter(String action, String prefix) {
        if (action == null || !action.startsWith(prefix) || action.length() == prefix.length()) {
            return Optional.empty();
        }
        return Optional.of(action.substring(prefix.length()));
    }
}
