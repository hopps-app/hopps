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
 * Turns every authenticated request into two independent activity signals for the current
 * {@link app.hopps.member.domain.Member}: it accumulates time spent in the application, and it stamps
 * {@code last_seen_at}.
 * <p>
 * The two are deliberately separate, because they answer different questions on very different timescales.
 * {@code last_seen_at} only feeds the admin org list's {@code lastActivityAt} and the 90-day active/dormant split, so
 * its resolution is irrelevant and it is throttled to {@link #LAST_SEEN_THROTTLE} purely to avoid a write per request.
 * Time-in-app needs real resolution, so it goes through {@code MemberActivityRepository.accumulate}, which does its own
 * (much tighter) throttling and delta-capping inside a single statement.
 * <p>
 * Both are dispatched fire-and-forget onto a Vert.x worker thread so they never block the request nor run blocking JDBC
 * on the event loop. Anonymous requests (no bearer token, hence no {@code sub}) are ignored, and any failure is
 * swallowed — activity tracking must never affect the actual request.
 * <p>
 * <strong>Caution:</strong> the time metric assumes that requests only happen when a human is doing something. It
 * therefore breaks silently if the frontend ever polls in the background — setting {@code refetchInterval} on a React
 * Query, adding a websocket keepalive over REST, or similar would make every open tab accrue time indefinitely, and
 * nothing here would warn you. The SPA heartbeat is the deliberate exception: it only fires while the tab is visible
 * and the member has recently interacted.
 */
@ApplicationScoped
public class LastSeenFilter {

    private static final Logger LOG = LoggerFactory.getLogger(LastSeenFilter.class);

    /**
     * How stale {@code last_seen_at} must be before it is rewritten. Generous on purpose: it is only read to decide
     * whether an organization has been active in the last 90 days, so an hour of imprecision is meaningless, and the
     * looser it is the fewer writes ordinary traffic causes.
     */
    private static final Duration LAST_SEEN_THROTTLE = Duration.ofHours(1);

    @Inject
    MemberRepository memberRepository;

    @Inject
    MemberActivityRepository activityRepository;

    @Inject
    JsonWebToken jwt;

    @Inject
    Vertx vertx;

    @ServerRequestFilter
    public void recordActivity() {
        String keycloakId = currentKeycloakId();
        if (keycloakId == null) {
            return;
        }
        Instant now = Instant.now();
        LocalDate today = LocalDate.now();
        // Fire-and-forget on a worker thread: each statement runs in its own transaction (both repository methods are
        // @Transactional) and must not delay or fail the request it belongs to. Both calls are unconditional here —
        // they throttle themselves in SQL, so there is no reason to gate one on the other.
        vertx.executeBlocking(() -> {
            try {
                activityRepository.accumulate(keycloakId, today, now);
                memberRepository.touchLastSeen(keycloakId, now, now.minus(LAST_SEEN_THROTTLE));
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
