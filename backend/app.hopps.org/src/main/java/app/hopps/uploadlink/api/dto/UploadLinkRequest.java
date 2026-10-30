package app.hopps.uploadlink.api.dto;

import java.time.Instant;

/**
 * Settings for a new upload link.
 *
 * @param expiresAt
 *            when the link stops working; null for a link that does not expire
 */
public record UploadLinkRequest(Instant expiresAt) {
}
