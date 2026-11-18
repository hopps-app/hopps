package app.hopps.whatsapp.api.dto;

import app.hopps.whatsapp.domain.WhatsAppContact;
import app.hopps.whatsapp.domain.WhatsAppContactStatus;

import java.time.Instant;

/**
 * A person invited to a bommel's WhatsApp receipts, as shown to members. The full number is not exposed.
 *
 * @param maskedPhoneNumber
 *            last four digits only, e.g. {@code ••• 5678}
 * @param invitationExpired
 *            true when an unanswered invitation can no longer be accepted
 * @param joinedAt
 *            when the invitation was accepted; null before
 */
public record WhatsAppContactResponse(
        Long id,
        String name,
        String maskedPhoneNumber,
        WhatsAppContactStatus status,
        boolean invitationExpired,
        String invitedBy,
        Instant invitedAt,
        Instant joinedAt) {

    public static WhatsAppContactResponse from(WhatsAppContact contact) {
        return new WhatsAppContactResponse(contact.id, contact.getName(), contact.getMaskedPhoneNumber(),
                contact.getStatus(),
                contact.getStatus() == WhatsAppContactStatus.INVITED && contact.isInvitationExpired(Instant.now()),
                contact.getInvitedBy(), contact.getInvitedAt(), contact.getJoinedAt());
    }
}
