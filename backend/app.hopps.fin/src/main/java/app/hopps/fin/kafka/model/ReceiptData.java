package app.hopps.fin.kafka.model;

import app.hopps.fin.jpa.TransactionRecordConverter;
import app.hopps.fin.jpa.entities.TransactionRecord;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

public record ReceiptData(
        Long referenceKey,
        BigDecimal total,
        Optional<String> storeName,
        Optional<Address> storeAddress,
        Optional<LocalDateTime> transactionTime) implements TransactionRecordConverter {

    public ReceiptData(Long referenceKey, BigDecimal total) {
        this(referenceKey, total, Optional.empty(), Optional.empty(), Optional.empty());
    }

    @Override
    public Long getReferenceKey() {
        return referenceKey();
    }

    @Override
    public void updateTransactionRecord(TransactionRecord transactionRecord) {
        transactionRecord.setTotal(total());

        // Optional
        storeName().ifPresent(transactionRecord::setName);
        storeAddress().ifPresent(address -> transactionRecord.setAddress(address.convertToJpa()));
        transactionTime().ifPresent(
                transactionTime -> transactionRecord.setTransactionTime(transactionTime.toInstant(ZoneOffset.UTC)));
    }
}
