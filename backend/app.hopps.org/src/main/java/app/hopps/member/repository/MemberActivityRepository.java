package app.hopps.member.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Write and retention access to {@code member_activity_day}, the per-member-per-day record of time spent in the
 * application behind the admin activity chart. The chart read lives in {@code AdminOrganizationRepository}.
 * <p>
 * The stored value is {@code active_seconds}: elapsed time, not a count of events. Every activity signal (an
 * authenticated request via {@code LastSeenFilter}, or an explicit heartbeat from the SPA) adds the gap since the
 * previous signal — but only if that gap is at most {@link #MAX_GAP_SECONDS}. A longer gap is read as "the member was
 * away" and adds nothing, which is what keeps an idle tab from logging hours.
 * <p>
 * Accumulating the <em>real elapsed delta</em> rather than a fixed amount per signal is what makes the number robust:
 * it is independent of how often the client signals, so the web heartbeat interval can change (or web and mobile can
 * use different ones) without making totals incomparable, and a client that spams the heartbeat endpoint adds
 * approximately nothing, because each extra signal contributes only the microseconds since the last one.
 */
@ApplicationScoped
public class MemberActivityRepository {

    /**
     * How long activity rows are kept. This is retention only — the chart's own window is much shorter (see
     * {@code AdminOrganizationRepository.ACTIVITY_WINDOW_DAYS}). One narrow row per member per day makes history cheap:
     * a hundred members cost ~36k rows a year, so keeping over a year of it enables long-range trends for free.
     */
    public static final int RETENTION_DAYS = 400;

    /**
     * Minimum spacing between two accumulating writes for the same member. Purely a write-amplification guard: with a
     * {@link #MAX_GAP_SECONDS} measured in minutes, quantising to 30s is invisible in a figure displayed as hours, but
     * it caps the write rate at 120/hour per actively-clicking member instead of one write per request.
     */
    public static final long MIN_BEAT_INTERVAL_SECONDS = 30;

    /**
     * The longest silence still counted as continuous presence. This constant <em>is</em> the definition of the metric:
     * a stretch longer than this with no signal counts as the member having left.
     * <p>
     * Three minutes is a deliberate compromise. Larger, and an idle tab or a member who wandered off accrues phantom
     * time; smaller, and ordinary read-then-click rhythms get chopped into separate sessions. It also bounds the error
     * from the one case the server genuinely cannot see: a member typing into a form (which makes no requests) looks
     * identical to a member who left, so time beyond this gap is lost unless the SPA heartbeat is running.
     */
    public static final long MAX_GAP_SECONDS = Duration.ofMinutes(3).toSeconds();

    @Inject
    EntityManager entityManager;

    /**
     * Records an activity signal for the member with the given Keycloak id at {@code now}, adding the elapsed time
     * since that member's previous signal to {@code day}'s total.
     * <p>
     * One statement, so there is no read-then-write race between concurrent requests for the same member. The first
     * signal of a day inserts a row with zero seconds and starts the clock — time before the first observation cannot
     * be credited. Subsequent signals add {@code now - last_beat_at} when that is at most {@link #MAX_GAP_SECONDS}, and
     * nothing otherwise. Signals arriving within {@link #MIN_BEAT_INTERVAL_SECONDS} of the previous one are dropped by
     * the {@code where} clause on the upsert, which also makes the call idempotent when a heartbeat request triggers
     * both the endpoint and {@code LastSeenFilter}. Does nothing if no member matches.
     */
    @Transactional
    public void accumulate(String keycloakId, LocalDate day, Instant now) {
        // `excluded.last_beat_at` is the proposed value, i.e. `now`, already typed as timestamptz by the column — using
        // it instead of rebinding the parameter keeps the delta arithmetic free of casts.
        entityManager.createNativeQuery(
                "insert into member_activity_day (member_id, activity_date, active_seconds, last_beat_at) "
                        + "select m.id, cast(:day as date), 0, cast(:now as timestamptz) "
                        + "  from member m where m.keycloak_id = :kid "
                        + "on conflict (member_id, activity_date) do update "
                        + "   set active_seconds = member_activity_day.active_seconds + "
                        + "         case when member_activity_day.last_beat_at is not null "
                        + "               and extract(epoch from (excluded.last_beat_at - member_activity_day.last_beat_at)) <= :maxGap "
                        + "              then cast(floor(extract(epoch from (excluded.last_beat_at - member_activity_day.last_beat_at))) as bigint) "
                        + "              else 0 end, "
                        + "       last_beat_at = excluded.last_beat_at "
                        + " where member_activity_day.last_beat_at is null "
                        + "    or extract(epoch from (excluded.last_beat_at - member_activity_day.last_beat_at)) >= :minInterval")
                .setParameter("day", day)
                .setParameter("now", now)
                .setParameter("kid", keycloakId)
                .setParameter("maxGap", MAX_GAP_SECONDS)
                .setParameter("minInterval", MIN_BEAT_INTERVAL_SECONDS)
                .executeUpdate();
    }

    /**
     * Deletes activity rows strictly older than {@code cutoff}, keeping the table bounded to the retention window.
     *
     * @return the number of rows removed
     */
    @Transactional
    public int pruneOlderThan(LocalDate cutoff) {
        return entityManager.createNativeQuery(
                "delete from member_activity_day where activity_date < :cutoff")
                .setParameter("cutoff", cutoff)
                .executeUpdate();
    }
}
