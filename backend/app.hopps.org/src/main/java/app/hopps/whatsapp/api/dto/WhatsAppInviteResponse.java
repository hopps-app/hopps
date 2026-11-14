package app.hopps.whatsapp.api.dto;

import app.hopps.whatsapp.domain.WhatsAppInvite;
import app.hopps.whatsapp.service.InviteCodes;

import java.time.Instant;

/**
 * The WhatsApp invite of a bommel, as shown to members managing it.
 *
 * @param code
 *            formatted code, e.g. {@code ABCDE-FGHJK}
 * @param joinUrl
 *            link that opens WhatsApp with the code pre-filled; null when no WhatsApp number is configured
 */
public record WhatsAppInviteResponse(
        Long bommelId,
        String code,
        String joinUrl,
        // null when the invite does not expire
        Instant expiresAt,
        boolean expired,
        Instant createdAt,
        String createdBy) {

    public static WhatsAppInviteResponse from(WhatsAppInvite invite, String joinUrl) {
        return new WhatsAppInviteResponse(
                invite.getBommel().id,
                InviteCodes.format(invite.getCode()),
                joinUrl,
                invite.getExpiresAt(),
                invite.isExpired(Instant.now()),
                invite.getCreatedAt(),
                invite.getCreatedBy());
    }
}
