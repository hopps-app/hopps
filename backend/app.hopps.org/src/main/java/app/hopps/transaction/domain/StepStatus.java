package app.hopps.transaction.domain;

/**
 * Status of an individual analysis step.
 */
public enum StepStatus {
    /**
     * Step is waiting to be executed.
     */
    PENDING,

    /**
     * Step is currently executing.
     */
    IN_PROGRESS,

    /**
     * Step completed successfully.
     */
    COMPLETED,

    /**
     * Step was skipped (e.g., ZugFerd not applicable).
     */
    SKIPPED,

    /**
     * Step failed with an error.
     */
    FAILED
}
