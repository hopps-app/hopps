package app.hopps.bankimport.domain;

/**
 * Match status of a bank transaction. UNMATCHED is the initial state after import.
 */
public enum BankTransactionStatus {
    UNMATCHED,
    PARTIALLY_MATCHED,
    FULLY_MATCHED,
    IGNORED
}
