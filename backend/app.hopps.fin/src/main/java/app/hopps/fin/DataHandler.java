package app.hopps.fin;

import app.hopps.fin.jpa.TransactionRecordConverter;
import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.Optional;

/**
 * Constructor injection is not possible thanks to the kogito
 */
@ApplicationScoped
@SuppressWarnings("java:S6813")
public class DataHandler {
    @Inject
    TransactionRecordRepository repository;

    public void processTransactionRecord(TransactionRecordConverter recordConverter) {
        persistAndVerify(recordConverter);
    }

    @Transactional
    void persistAndVerify(TransactionRecordConverter recordConverter) {
        Optional<TransactionRecord> byIdOptional = repository.findByIdOptional(recordConverter.getReferenceKey());
        if (byIdOptional.isEmpty()) {
            throw new IllegalStateException("Reference key is not found!");
        }

        TransactionRecord transactionRecord = byIdOptional.get();
        recordConverter.updateTransactionRecord(transactionRecord);

        repository.persist(transactionRecord);
    }
}
