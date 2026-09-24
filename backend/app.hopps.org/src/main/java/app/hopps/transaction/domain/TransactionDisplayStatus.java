package app.hopps.transaction.domain;

/**
 * Status of a transaction as it is shown to the user. Only {@link TransactionStatus#DRAFT} and
 * {@link TransactionStatus#CONFIRMED} are stored; the two states in between are derived from how much of the amount the
 * linked bank movements cover (the signed net coverage, see {@code BankTransactionMatchService}).
 */
public enum TransactionDisplayStatus {
    /**
     * Not confirmed and no bank movement linked (net coverage is zero).
     */
    DRAFT,

    /**
     * Not confirmed; bank movements are linked but do not add up to the amount.
     */
    PARTIAL,

    /**
     * Not confirmed; the linked bank movements cover the amount exactly.
     */
    LINKED,

    /**
     * Confirmed.
     */
    CONFIRMED
}
