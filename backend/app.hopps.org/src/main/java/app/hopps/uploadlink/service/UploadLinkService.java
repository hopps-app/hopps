package app.hopps.uploadlink.service;

import app.hopps.bommel.domain.Bommel;
import app.hopps.uploadlink.domain.BommelUploadLink;
import app.hopps.uploadlink.repository.BommelUploadLinkRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.Response;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

/**
 * Creates, replaces and revokes the upload link of a bommel, and resolves a token from the public upload page.
 */
@ApplicationScoped
public class UploadLinkService {
    private static final SecureRandom RANDOM = new SecureRandom();
    // 32 random bytes = 256 bit, base64url without padding: 43 characters
    private static final int TOKEN_BYTES = 32;

    @Inject
    BommelUploadLinkRepository linkRepository;

    public Optional<BommelUploadLink> find(Bommel bommel) {
        return linkRepository.findByBommelId(bommel.id);
    }

    /**
     * Creates a new link for the bommel. An existing link is replaced, so its token stops working.
     */
    public BommelUploadLink regenerate(Bommel bommel, Instant expiresAt, String createdBy) {
        revoke(bommel);

        BommelUploadLink link = new BommelUploadLink();
        link.setBommel(bommel);
        link.setToken(newToken());
        link.setExpiresAt(expiresAt);
        link.setCreatedBy(createdBy);
        linkRepository.persistAndFlush(link);
        return link;
    }

    /**
     * Deletes the bommel's link, if it has one.
     */
    public void revoke(Bommel bommel) {
        find(bommel).ifPresent(link -> {
            linkRepository.delete(link);
            // The unique bommel_id would otherwise clash with a link inserted in the same transaction.
            linkRepository.flush();
        });
    }

    /**
     * @throws NotFoundException
     *             if no link has this token (never existed, revoked or replaced)
     * @throws ClientErrorException
     *             (410 Gone) if the link has expired
     */
    public BommelUploadLink resolveActive(String token) {
        BommelUploadLink link = linkRepository.findByToken(token)
                .orElseThrow(() -> new NotFoundException("Upload link not found"));
        if (link.isExpired(Instant.now())) {
            throw new ClientErrorException("Upload link has expired", Response.Status.GONE);
        }
        return link;
    }

    static String newToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
