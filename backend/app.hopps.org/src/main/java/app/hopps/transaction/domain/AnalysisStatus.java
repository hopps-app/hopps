package app.hopps.transaction.domain;

/**
 * Overall status of document analysis.
 */
public enum AnalysisStatus {
    /**
     * Analysis has been queued but not yet started.
     */
    QUEUED,

    /**
     * Analysis is currently in progress.
     */
    IN_PROGRESS,

    /**
     * Analysis completed successfully.
     */
    COMPLETED,

    /**
     * Analysis failed.
     */
    FAILED
}
