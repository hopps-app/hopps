package app.hopps.chatbot.invitation.service;

import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Messages the bot would have sent first via WhatsApp (invitations), kept in memory per phone number for the debug chat
 * to pick up. Only filled when the invitation channel is {@code debug}.
 */
@ApplicationScoped
public class DebugOutbox {

    private final Map<String, List<Message>> messages = new ConcurrentHashMap<>();

    public void add(String phoneNumber, Message message) {
        messages.computeIfAbsent(phoneNumber, k -> new ArrayList<>()).add(message);
    }

    /** Returns and removes the waiting messages of the number. */
    public List<Message> take(String phoneNumber) {
        List<Message> waiting = messages.remove(phoneNumber);
        return waiting == null ? List.of() : List.copyOf(waiting);
    }

    public record Message(String text, List<Button> buttons, Instant sentAt) {
    }

    public record Button(String title, String payload) {
    }
}
