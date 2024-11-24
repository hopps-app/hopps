package app.hopps.fin;

import app.hopps.fin.jpa.TransactionRecordConverter;
import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class DataHandler {

    @Inject
    TransactionRecordRepository repository;

    public void processTransactionRecord(TransactionRecordConverter recordConverter) {
        persistAndVerify(recordConverter.convertToTransactionRecord());
    }

    @Transactional
    void persistAndVerify(TransactionRecord transactionRecord) {
        repository.persist(transactionRecord);

        if (!repository.isPersistent(transactionRecord)) {
            throw new IllegalStateException("Transaction could not be saved!");
        }
    }
}
