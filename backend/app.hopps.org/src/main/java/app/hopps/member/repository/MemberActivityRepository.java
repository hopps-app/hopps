package app.hopps.member.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.time.LocalDate;

/**
 * Write and retention access to {@code member_activity_day}, the per-member-per-day activity record behind the admin
 * LoginActivityChart. Kept deliberately small: {@code MemberActivityPruneJob} deletes anything older than
 * {@link #WINDOW_DAYS} on a daily schedule. The chart read lives in {@code AdminOrganizationRepository}.
 */
@ApplicationScoped
public class MemberActivityRepository {

    /** Retention and chart window, in days (inclusive of today). The table never usefully holds more than this. */
    public static final int WINDOW_DAYS = 7;

    @Inject
    EntityManager entityManager;

    /**
     * Records an activity event for the member with the given Keycloak id on {@code day}. The first event of the day
     * inserts a row with {@code activity_count = 1}; every subsequent event that day increments the counter. Does
     * nothing if no member matches. Callers (LastSeenFilter) throttle how often this fires, so the counter reflects
     * throttled activity events rather than raw request count.
     */
    @Transactional
    public void recordActivity(String keycloakId, LocalDate day) {
        entityManager.createNativeQuery(
                "insert into member_activity_day (member_id, activity_date) "
                        + "select id, :day from member where keycloak_id = :kid "
                        + "on conflict (member_id, activity_date) "
                        + "do update set activity_count = member_activity_day.activity_count + 1")
                .setParameter("day", day)
                .setParameter("kid", keycloakId)
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
