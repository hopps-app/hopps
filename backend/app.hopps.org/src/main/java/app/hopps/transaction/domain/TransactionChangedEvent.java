package app.hopps.transaction.domain;

/**
 * Fired after a {@link Transaction}'s amount ({@code total}) has changed so other slices can react to the new value
 * (e.g. the bank-import slice refreshes any {@code BankTransactionMatch} snapshot and recomputes the affected bank
 * transaction status, so a partially covered bank transaction no longer stays FULLY_MATCHED).
 *
 * @param transactionId
 *            the ID of the transaction whose amount changed
 */
public record TransactionChangedEvent(Long transactionId) {
}
