package app.hopps.fin.model;

import app.hopps.fin.jpa.entities.TransactionRecord;

public interface Data {
    void updateTransactionRecord(TransactionRecord transactionRecord);
}
