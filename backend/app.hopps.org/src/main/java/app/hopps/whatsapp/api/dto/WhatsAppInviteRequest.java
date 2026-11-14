package app.hopps.whatsapp.api.dto;

import java.time.Instant;

/**
 * Settings for a new WhatsApp invite.
 *
 * @param expiresAt
 *            when the code can no longer be redeemed; null for an invite that does not expire
 */
public record WhatsAppInviteRequest(Instant expiresAt) {
}
