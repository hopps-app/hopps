package app.hopps.bankimport.service;

import app.hopps.transaction.domain.TransactionDeletedEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

/**
 * Keeps bank-transaction matches consistent when a bookkeeping transaction is deleted. Observes
 * {@link TransactionDeletedEvent} synchronously (within the deleting transaction, before the row is removed) and
 * removes the related matches, recomputing the affected bank transaction status.
 */
@ApplicationScoped
public class BankTransactionMatchCleanup {

    @Inject
    BankTransactionMatchService matchService;

    public void onTransactionDeleted(@Observes TransactionDeletedEvent event) {
        matchService.removeMatchesForTransaction(event.transactionId());
    }
}
