package app.hopps.fin.jpa;

import app.hopps.fin.jpa.entities.TransactionRecord;

public interface TransactionRecordConverter {
    TransactionRecord convertToTransactionRecord();
}
