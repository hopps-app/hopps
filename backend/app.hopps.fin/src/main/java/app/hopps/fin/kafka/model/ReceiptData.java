package app.hopps.fin.kafka.model;

import app.hopps.fin.jpa.TransactionRecordConverter;
import app.hopps.fin.jpa.entities.TransactionRecord;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

public record ReceiptData(
        BigDecimal total,
        Optional<BigDecimal> subTotal,
        Optional<String> storeName,
        Optional<Address> storeAddress,
        Optional<Instant> transactionTime) implements TransactionRecordConverter {
    
    @Override
    public TransactionRecord convertToTransactionRecord() {
        TransactionRecord transactionRecord = new TransactionRecord(total());
        // Optional
        subTotal().ifPresent(transactionRecord::setSubTotal);
        storeName().ifPresent(transactionRecord::setName);
        storeAddress().ifPresent(address -> transactionRecord.setAddress(address.convertToJpa()));
        transactionTime().ifPresent(transactionRecord::setTransactionTime);

        return transactionRecord;
    }
}
