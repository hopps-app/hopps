package app.hopps.uploadlink.api.dto;

import java.time.Instant;

/**
 * What the public upload page shows about the link: whose receipts are collected, and until when.
 */
public record PublicUploadLinkInfo(
        String organizationName,
        String bommelName,
        String bommelEmoji,
        Instant expiresAt) {
}
