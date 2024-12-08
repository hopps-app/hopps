package app.hopps.fin.kafka.model;

import app.hopps.fin.jpa.TransactionRecordConverter;
import app.hopps.fin.jpa.entities.TransactionRecord;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

public record ReceiptData(
        BigDecimal total,
        Optional<BigDecimal> subTotal,
        Optional<String> storeName,
        Optional<Address> storeAddress,
        Optional<LocalDateTime> transactionTime) implements TransactionRecordConverter {

    public ReceiptData(BigDecimal total) {
        this(total, Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty());
    }

    @Override
    public TransactionRecord convertToTransactionRecord() {
        TransactionRecord transactionRecord = new TransactionRecord(total());
        // Optional
        subTotal().ifPresent(transactionRecord::setSubTotal);
        storeName().ifPresent(transactionRecord::setName);
        storeAddress().ifPresent(address -> transactionRecord.setAddress(address.convertToJpa()));
        transactionTime().ifPresent(
                transactionTime -> transactionRecord.setTransactionTime(transactionTime.toInstant(ZoneOffset.UTC)));

        return transactionRecord;
    }
}
