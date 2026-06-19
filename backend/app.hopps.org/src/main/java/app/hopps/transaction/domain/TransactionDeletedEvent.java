package app.hopps.transaction.domain;

/**
 * Fired just before a {@link Transaction} is deleted so other slices can clean up references to it (e.g. the
 * bank-import slice removes any {@code BankTransactionMatch} and recomputes the affected bank transaction status).
 * Fired before the actual delete so observers can still read the existing links.
 *
 * @param transactionId
 *            the ID of the transaction being deleted
 */
public record TransactionDeletedEvent(Long transactionId) {
}
