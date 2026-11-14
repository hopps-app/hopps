package app.hopps.whatsapp.api.dto;

import app.hopps.whatsapp.domain.WhatsAppContact;

import java.time.Instant;

/**
 * A phone number connected to a bommel, as shown to members. The full number is not exposed.
 *
 * @param maskedPhoneNumber
 *            last four digits only, e.g. {@code ••• 5678}
 */
public record WhatsAppContactResponse(Long id, String displayName, String maskedPhoneNumber, Instant joinedAt) {

    public static WhatsAppContactResponse from(WhatsAppContact contact) {
        return new WhatsAppContactResponse(contact.id, contact.getDisplayName(), contact.getMaskedPhoneNumber(),
                contact.getJoinedAt());
    }
}
