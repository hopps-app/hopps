package app.hopps.member.repository;

import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Covers the accumulator's arithmetic, which is the whole definition of the time-in-app metric: which gaps count as
 * continuous presence, which are discarded as absence, and which signals are dropped as too frequent to be worth a
 * write.
 * <p>
 * The instants used here are fixed and unrelated to the current date on purpose. Nothing in the accumulator compares
 * {@code last_beat_at} to the real clock — the calendar day is passed separately — so pinning them keeps the test
 * deterministic.
 */
@QuarkusTest
class MemberActivityRepositoryTest {

    /** Member 15 of the test data, a member of buehnefrei-ev. */
    private static final String KEYCLOAK_ID = "00000000-0000-0000-0000-000000000015";
    private static final long MEMBER_ID = 15L;

    private static final Instant T0 = Instant.parse("2026-07-30T09:00:00Z");
    private static final LocalDate DAY = LocalDate.of(2026, 7, 30);

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    MemberActivityRepository repository;

    @Inject
    EntityManager entityManager;

    @BeforeEach
    void cleanDatabase() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    @Test
    @DisplayName("should start the clock at zero on the first signal of a day")
    void shouldStartAtZero() {
        // Time before the very first observation cannot be credited — there is nothing to measure the gap against.
        repository.accumulate(KEYCLOAK_ID, DAY, T0);

        assertEquals(0L, activeSeconds());
    }

    @Test
    @DisplayName("should add the real elapsed gap when it is short enough to be continuous presence")
    void shouldAccumulateElapsedTime() {
        repository.accumulate(KEYCLOAK_ID, DAY, T0);
        repository.accumulate(KEYCLOAK_ID, DAY, T0.plusSeconds(60));
        repository.accumulate(KEYCLOAK_ID, DAY, T0.plusSeconds(120));

        // Two 60-second gaps — the elapsed time, not a fixed amount per signal.
        assertEquals(120L, activeSeconds());
    }

    @Test
    @DisplayName("should ignore a signal arriving inside the minimum interval")
    void shouldDropSignalsInsideTheMinimumInterval() {
        repository.accumulate(KEYCLOAK_ID, DAY, T0);
        repository.accumulate(KEYCLOAK_ID, DAY, T0.plusSeconds(60));
        // 10 seconds after the previous signal: below MIN_BEAT_INTERVAL_SECONDS, so not worth a write.
        repository.accumulate(KEYCLOAK_ID, DAY, T0.plusSeconds(70));

        assertEquals(60L, activeSeconds());
    }

    @Test
    @DisplayName("should be effectively free to call repeatedly, so a spamming client cannot inflate its time")
    void shouldResistSpam() {
        repository.accumulate(KEYCLOAK_ID, DAY, T0);
        for (int i = 1; i <= 200; i++) {
            repository.accumulate(KEYCLOAK_ID, DAY, T0.plusMillis(i));
        }

        // Two hundred signals inside a single second add nothing: each contributes only the real time since the last.
        assertEquals(0L, activeSeconds());
    }

    @Test
    @DisplayName("should discard a gap longer than the maximum, then re-anchor")
    void shouldDiscardLongGaps() {
        repository.accumulate(KEYCLOAK_ID, DAY, T0);
        repository.accumulate(KEYCLOAK_ID, DAY, T0.plusSeconds(60));

        // Away for longer than MAX_GAP_SECONDS: the absence itself contributes nothing ...
        Instant afterBreak = T0.plusSeconds(60 + MemberActivityRepository.MAX_GAP_SECONDS + 60);
        repository.accumulate(KEYCLOAK_ID, DAY, afterBreak);
        assertEquals(60L, activeSeconds());

        // ... but the signal still re-anchors the clock, so the next stretch of presence counts normally.
        repository.accumulate(KEYCLOAK_ID, DAY, afterBreak.plusSeconds(60));
        assertEquals(120L, activeSeconds());
    }

    @Test
    @DisplayName("should count a gap exactly at the maximum as continuous presence")
    void shouldCountGapAtTheBoundary() {
        repository.accumulate(KEYCLOAK_ID, DAY, T0);
        repository.accumulate(KEYCLOAK_ID, DAY, T0.plusSeconds(MemberActivityRepository.MAX_GAP_SECONDS));

        assertEquals(MemberActivityRepository.MAX_GAP_SECONDS, activeSeconds());
    }

    @Test
    @DisplayName("should keep each calendar day on its own clock")
    void shouldSeparateDays() {
        repository.accumulate(KEYCLOAK_ID, DAY, T0);
        repository.accumulate(KEYCLOAK_ID, DAY, T0.plusSeconds(60));
        repository.accumulate(KEYCLOAK_ID, DAY.minusDays(1), T0.minusSeconds(86400));

        assertEquals(60L, activeSeconds());
        // The previous day starts from zero rather than inheriting the other day's anchor.
        assertEquals(0L, activeSeconds(DAY.minusDays(1)));
    }

    @Test
    @DisplayName("should do nothing for an unknown keycloak id")
    void shouldIgnoreUnknownMember() {
        repository.accumulate("no-such-member", DAY, T0);

        assertThrows(NoResultException.class, this::activeSeconds);
    }

    private long activeSeconds() {
        return activeSeconds(DAY);
    }

    private long activeSeconds(LocalDate day) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) entityManager
                        .createNativeQuery("select active_seconds from member_activity_day "
                                + "where member_id = :member and activity_date = :day")
                        .setParameter("member", MEMBER_ID)
                        .setParameter("day", day)
                        .getSingleResult()).longValue());
    }
}
