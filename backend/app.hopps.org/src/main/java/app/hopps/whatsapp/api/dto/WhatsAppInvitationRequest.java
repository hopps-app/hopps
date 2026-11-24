package app.hopps.whatsapp.api.dto;

/**
 * Whom to invite to send receipts for a bommel via WhatsApp.
 *
 * @param name
 *            shown in the list and used as "uploaded by" of the person's receipts
 * @param phoneNumber
 *            with country code, e.g. {@code +49 176 1234567}
 */
public record WhatsAppInvitationRequest(String name, String phoneNumber) {
}
