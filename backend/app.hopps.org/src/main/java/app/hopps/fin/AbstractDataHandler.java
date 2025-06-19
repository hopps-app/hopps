package app.hopps.fin;

import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import app.hopps.fin.model.Data;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.Optional;

@SuppressWarnings("java:S6813")
public abstract class AbstractDataHandler {
    @Inject
    TransactionRecordRepository repository;

    @Transactional
    public void handleData(Data data) {
        TransactionRecord transactionRecord = getAndVerify(data.referenceKey());

        updateData(transactionRecord, data);
        repository.persist(transactionRecord);
    }

    private TransactionRecord getAndVerify(Long referenceKey) {
        Optional<TransactionRecord> optionalTransactionRecord = repository.findByIdOptional(referenceKey);
        if (optionalTransactionRecord.isEmpty()) {
            throw new IllegalStateException("Reference key is not found!");
        }
        return optionalTransactionRecord.get();
    }

    protected abstract void updateData(TransactionRecord transactionRecord, Data data);
}
