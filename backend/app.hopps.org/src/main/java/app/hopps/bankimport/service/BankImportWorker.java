package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankImportStatus;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * In-process polling worker that picks up QUEUED {@link BankImport} jobs and runs them via {@link CsvImportService}.
 * Runs at most one job per tick; with {@code concurrentExecution = SKIP} long imports do not back up the scheduler. A
 * second scheduled task acts as a watchdog for crashed workers (Q13 / §4.6).
 */
@ApplicationScoped
public class BankImportWorker {

    private static final Logger LOG = LoggerFactory.getLogger(BankImportWorker.class);
    /** A worker that has been PROCESSING this long is presumed dead — flip it to FAILED so it doesn't hang forever. */
    private static final Duration STUCK_THRESHOLD = Duration.ofMinutes(30);

    @Inject
    CsvImportService importService;

    @Scheduled(every = "5s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    public void pollQueue() {
        Long claimedId = claimNextJob();
        if (claimedId == null) {
            return;
        }
        try {
            importService.runImport(claimedId);
        } catch (Exception e) {
            // CsvImportService is supposed to set FAILED on its own in the unhappy path, but if the transaction
            // itself blew up we mark the job here.
            LOG.error("Worker failed processing import {}", claimedId, e);
            markFailed(claimedId, "Worker exception: " + e.getMessage());
        }
    }

    @Scheduled(every = "10m")
    @Transactional
    public void watchdog() {
        Instant cutoff = Instant.now().minus(STUCK_THRESHOLD);
        long stuck = BankImport.update(
                "status = ?1, finishedAt = ?2, failureReason = ?3 " +
                        "where status = ?4 and startedAt < ?5",
                BankImportStatus.FAILED, Instant.now(), "Worker timeout (>30m PROCESSING)",
                BankImportStatus.PROCESSING, cutoff);
        if (stuck > 0) {
            LOG.warn("Watchdog reset {} stuck import job(s) to FAILED", stuck);
        }
    }

    @Transactional
    Long claimNextJob() {
        Optional<BankImport> next = BankImport.find("status", BankImportStatus.QUEUED).firstResultOptional();
        if (next.isEmpty()) {
            return null;
        }
        BankImport job = next.get();
        job.setStatus(BankImportStatus.PROCESSING);
        job.setStartedAt(Instant.now());
        return job.getId();
    }

    @Transactional
    void markFailed(Long importId, String reason) {
        BankImport job = BankImport.findById(importId);
        if (job != null && job.getStatus() == BankImportStatus.PROCESSING) {
            job.setStatus(BankImportStatus.FAILED);
            job.setFailureReason(reason);
            job.setFinishedAt(Instant.now());
        }
    }
}
