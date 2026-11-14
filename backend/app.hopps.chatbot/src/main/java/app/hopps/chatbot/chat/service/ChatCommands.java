package app.hopps.chatbot.chat.service;

import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Messages the bot handles without the LLM: an invite code and the request to disconnect.
 */
final class ChatCommands {
    private static final Set<String> STOP_WORDS = Set.of("stop", "stopp", "abmelden", "unsubscribe");
    // "Hopps-Code: ABCDE-FGHJK" as pre-filled by the join link; the code itself in any case and separator
    private static final Pattern WITH_PREFIX = Pattern
            .compile("(?i)hopps[\\s-]*code\\s*:?\\s*([0-9a-z]{5}[\\s-]?[0-9a-z]{5})\\b");
    // or a message that is nothing but the code, as typed by hand
    private static final Pattern ONLY_CODE = Pattern.compile("(?i)\\s*([0-9a-z]{5}[\\s-]?[0-9a-z]{5})\\s*");

    private ChatCommands() {
    }

    static boolean isStop(String text) {
        return text != null && STOP_WORDS.contains(text.strip().toLowerCase(Locale.ROOT).replaceAll("[.!]+$", ""));
    }

    /** The invite code in the message, unnormalized (org normalizes it). */
    static Optional<String> inviteCode(String text) {
        if (text == null) {
            return Optional.empty();
        }
        Matcher prefixed = WITH_PREFIX.matcher(text);
        if (prefixed.find()) {
            return Optional.of(prefixed.group(1));
        }
        Matcher only = ONLY_CODE.matcher(text);
        // A bare 10-letter word is too likely to be ordinary text unless it contains a digit or the separator.
        if (only.matches() && only.group(1).matches(".*[0-9\\s-].*")) {
            return Optional.of(only.group(1));
        }
        return Optional.empty();
    }
}
