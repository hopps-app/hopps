package app.hopps.fin.jpa;

import app.hopps.fin.jpa.entities.TransactionRecord;

public interface TransactionRecordConverter {
    Long getReferenceKey();

    void updateTransactionRecord(TransactionRecord transactionRecord);
}
