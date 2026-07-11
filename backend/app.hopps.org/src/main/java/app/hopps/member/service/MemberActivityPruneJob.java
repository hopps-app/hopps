package app.hopps.member.service;

import app.hopps.member.repository.MemberActivityRepository;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;

/**
 * Keeps {@code member_activity_day} bounded to the retention window by deleting older rows once a day. Without this the
 * table would accumulate a row for every member on every day they were ever active.
 */
@ApplicationScoped
public class MemberActivityPruneJob {

    private static final Logger LOG = LoggerFactory.getLogger(MemberActivityPruneJob.class);

    @Inject
    MemberActivityRepository activityRepository;

    @Scheduled(cron = "0 15 3 * * ?")
    void prune() {
        // Keep today plus the previous WINDOW_DAYS-1 days; delete anything strictly older.
        LocalDate cutoff = LocalDate.now().minusDays(MemberActivityRepository.WINDOW_DAYS - 1L);
        int deleted = activityRepository.pruneOlderThan(cutoff);
        if (deleted > 0) {
            LOG.info("Pruned {} member activity rows older than {}", deleted, cutoff);
        }
    }
}
