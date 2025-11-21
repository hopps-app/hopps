package app.hopps.transaction.domain;

/**
 * Status of a transaction record in the analysis lifecycle.
 */
public enum TransactionStatus {
    /**
     * Transaction record created, analysis not yet started.
     */
    PENDING,

    /**
     * Analysis is currently in progress.
     */
    ANALYZING,

    /**
     * Analysis completed successfully.
     */
    ANALYZED,

    /**
     * Analysis failed.
     */
    FAILED
}
