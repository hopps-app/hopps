package app.hopps.transaction.domain;

/**
 * Status of a transaction in its lifecycle.
 */
public enum TransactionStatus {
    /**
     * Initial state - transaction can be edited.
     */
    DRAFT,

    /**
     * Finalized state - transaction is confirmed and shown in reports.
     */
    CONFIRMED
}
