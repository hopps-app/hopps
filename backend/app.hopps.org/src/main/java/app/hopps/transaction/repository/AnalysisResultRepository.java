package app.hopps.transaction.repository;

import app.hopps.transaction.domain.TransactionRecord;
import app.hopps.transaction.domain.TransactionRecordAnalysisResult;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

/**
 * Repository for accessing TransactionRecordAnalysisResult entities.
 */
@ApplicationScoped
public class AnalysisResultRepository implements PanacheRepository<TransactionRecordAnalysisResult> {

    /**
     * Find analysis result by transaction record ID.
     *
     * @param transactionRecordId the transaction record ID
     * @return the analysis result if found
     */
    public Optional<TransactionRecordAnalysisResult> findByTransactionRecordId(Long transactionRecordId) {
        return find("transactionRecord.id", transactionRecordId).firstResultOptional();
    }

    /**
     * Find analysis result by transaction record.
     *
     * @param transactionRecord the transaction record
     * @return the analysis result if found
     */
    public Optional<TransactionRecordAnalysisResult> findByTransactionRecord(TransactionRecord transactionRecord) {
        return find("transactionRecord", transactionRecord).firstResultOptional();
    }

    /**
     * Check if analysis result exists for a transaction record.
     *
     * @param transactionRecordId the transaction record ID
     * @return true if exists
     */
    public boolean existsByTransactionRecordId(Long transactionRecordId) {
        return count("transactionRecord.id", transactionRecordId) > 0;
    }
}
