package app.hopps.bankimport.domain;

/**
 * Lifecycle states of a bank import job. See bank-import-feature.md §4.6.
 */
public enum BankImportStatus {
    QUEUED,
    PROCESSING,
    COMPLETED,
    PARTIAL,
    FAILED
}
