package app.hopps.shared.security;

import app.hopps.member.repository.MemberActivityRepository;
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
import java.time.LocalDate;

/**
 * Stamps {@code last_seen_at} on the currently authenticated {@link app.hopps.member.domain.Member} on each request,
 * feeding the admin API's per-organization {@code lastActivityAt}.
 * <p>
 * The write is throttled to at most once per {@link #THROTTLE} window (a single conditional bulk UPDATE), so a busy
 * client does not cause a database write on every request. It is dispatched fire-and-forget onto a Vert.x worker thread
 * so it never blocks the request nor runs blocking JDBC on the event loop. Anonymous requests (no bearer token, hence
 * no {@code sub}) are ignored, and any failure is swallowed — activity tracking must never affect the actual request.
 * <p>
 * When (and only when) the throttled update actually refreshes {@code last_seen_at}, today's per-day activity row is
 * also recorded for the LoginActivityChart. Gating on the throttle keeps this to roughly one idempotent upsert per
 * member per throttle window rather than one per request, while still capturing the first request of each day (whose
 * {@code last_seen_at} is always stale from the prior day).
 */
@ApplicationScoped
public class LastSeenFilter {

    private static final Logger LOG = LoggerFactory.getLogger(LastSeenFilter.class);
    private static final Duration THROTTLE = Duration.ofMinutes(10);

    @Inject
    MemberRepository memberRepository;

    @Inject
    MemberActivityRepository activityRepository;

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
        LocalDate today = LocalDate.now();
        // Fire-and-forget on a worker thread: the throttled UPDATE runs in its own transaction (touchLastSeen is
        // @Transactional) and must not delay or fail the request it belongs to.
        vertx.executeBlocking(() -> {
            try {
                if (memberRepository.touchLastSeen(keycloakId, now, staleBefore) > 0) {
                    activityRepository.recordActivity(keycloakId, today);
                }
            } catch (RuntimeException e) {
                LOG.debug("Failed to record activity for member {}", keycloakId, e);
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
