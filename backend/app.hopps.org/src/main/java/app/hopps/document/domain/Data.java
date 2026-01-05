package app.hopps.document.domain;

import app.hopps.transaction.domain.TransactionRecord;

public interface Data {
    void updateTransactionRecord(TransactionRecord transactionRecord);
}
