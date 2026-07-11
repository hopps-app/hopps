package app.hopps.shared.security;

import app.hopps.member.repository.MemberRepository;
import io.vertx.core.Vertx;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.resteasy.reactive.server.ServerRequestFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.time.Instant;

/**
 * Stamps {@code last_seen_at} on the currently authenticated {@link app.hopps.member.domain.Member} on each request,
 * feeding the admin API's per-organization {@code lastActivityAt}.
 * <p>
 * The write is throttled to at most once per {@link #THROTTLE} window (a single conditional bulk UPDATE), so a busy
 * client does not cause a database write on every request. It is dispatched fire-and-forget onto a Vert.x worker thread
 * so it never blocks the request nor runs blocking JDBC on the event loop. Anonymous requests (no bearer token, hence
 * no {@code sub}) are ignored, and any failure is swallowed — activity tracking must never affect the actual request.
 */
@ApplicationScoped
public class LastSeenFilter {

    private static final Logger LOG = LoggerFactory.getLogger(LastSeenFilter.class);
    private static final Duration THROTTLE = Duration.ofMinutes(10);

    @Inject
    MemberRepository memberRepository;

    @Inject
    JsonWebToken jwt;

    @Inject
    Vertx vertx;

    @ServerRequestFilter
    public void recordLastSeen() {
        String keycloakId = currentKeycloakId();
        if (keycloakId == null) {
            return;
        }
        Instant now = Instant.now();
        Instant staleBefore = now.minus(THROTTLE);
        // Fire-and-forget on a worker thread: the throttled UPDATE runs in its own transaction (touchLastSeen is
        // @Transactional) and must not delay or fail the request it belongs to.
        vertx.executeBlocking(() -> {
            try {
                memberRepository.touchLastSeen(keycloakId, now, staleBefore);
            } catch (RuntimeException e) {
                LOG.debug("Failed to update last_seen_at for member {}", keycloakId, e);
            }
            return null;
        }, false);
    }

    private String currentKeycloakId() {
        try {
            return jwt.getSubject();
        } catch (RuntimeException e) {
            // No bearer token on this request (anonymous / non-JWT identity).
            return null;
        }
    }
}
