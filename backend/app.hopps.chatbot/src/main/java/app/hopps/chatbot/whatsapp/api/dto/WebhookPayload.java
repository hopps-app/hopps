package app.hopps.chatbot.whatsapp.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Body of a webhook notification from the WhatsApp Cloud API. Only the fields the chatbot uses are mapped; unknown
 * fields are ignored.
 *
 * @see <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components">Webhook components</a>
 */
public record WebhookPayload(String object, List<Entry> entry) {

    public record Entry(String id, List<Change> changes) {
    }

    public record Change(String field, ChangeValue value) {
    }

    /**
     * {@code messages} is set for incoming messages, {@code contacts} carries the senders' profile names; delivery
     * receipts arrive as {@code statuses} and are ignored.
     */
    public record ChangeValue(List<Contact> contacts, List<InboundMessage> messages) {
    }

    public record Contact(@JsonProperty("wa_id") String waId, Profile profile) {
    }

    public record Profile(String name) {
    }
}
