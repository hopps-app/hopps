package app.hopps.uploadlink.api.dto;

import app.hopps.uploadlink.domain.BommelUploadLink;

import java.time.Instant;

/**
 * The upload link of a bommel, as shown to members managing it. The SPA builds the shareable URL from the token.
 */
public record UploadLinkResponse(
        Long bommelId,
        String token,
        // null when the link does not expire
        Instant expiresAt,
        boolean expired,
        Instant createdAt,
        String createdBy) {

    public static UploadLinkResponse from(BommelUploadLink link) {
        return new UploadLinkResponse(
                link.getBommel().id,
                link.getToken(),
                link.getExpiresAt(),
                link.isExpired(Instant.now()),
                link.getCreatedAt(),
                link.getCreatedBy());
    }
}
