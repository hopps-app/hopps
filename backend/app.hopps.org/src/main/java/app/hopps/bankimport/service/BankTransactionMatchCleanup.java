package app.hopps.bankimport.service;

import app.hopps.transaction.domain.TransactionChangedEvent;
import app.hopps.transaction.domain.TransactionDeletedEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

/**
 * Keeps bank-transaction matches consistent with the bookkeeping transactions they reference. Observes transaction
 * lifecycle events synchronously (within the originating transaction) and refreshes the affected bank transaction
 * status:
 * <ul>
 * <li>{@link TransactionDeletedEvent} &mdash; removes the related matches before the row is removed.</li>
 * <li>{@link TransactionChangedEvent} &mdash; refreshes the match amount snapshot after the amount changed.</li>
 * </ul>
 */
@ApplicationScoped
public class BankTransactionMatchCleanup {

    @Inject
    BankTransactionMatchService matchService;

    public void onTransactionDeleted(@Observes TransactionDeletedEvent event) {
        matchService.removeMatchesForTransaction(event.transactionId());
    }

    public void onTransactionChanged(@Observes TransactionChangedEvent event) {
        matchService.updateMatchedAmountForTransaction(event.transactionId());
    }
}
