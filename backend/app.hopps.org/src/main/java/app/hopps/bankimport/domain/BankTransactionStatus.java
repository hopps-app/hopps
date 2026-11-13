package app.hopps.bankimport.domain;

/**
 * Match status of a bank transaction. UNMATCHED is the initial state after import.
 */
public enum BankTransactionStatus {
    UNMATCHED,
    PARTIALLY_MATCHED,
    FULLY_MATCHED,
    IGNORED,
    /**
     * A movement between two of the organization's own accounts, e.g. a PayPal top-up from the bank account or a
     * withdrawal to it. Set by the import; it needs no receipt and cannot be linked to a transaction.
     */
    TRANSFER
}
