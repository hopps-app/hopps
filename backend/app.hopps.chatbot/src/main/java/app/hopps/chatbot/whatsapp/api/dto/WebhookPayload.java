package app.hopps.chatbot.whatsapp.api.dto;

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

    /** {@code messages} is set for incoming messages; delivery receipts arrive as {@code statuses} and are ignored. */
    public record ChangeValue(List<InboundMessage> messages) {
    }
}
