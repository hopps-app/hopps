package app.hopps.fin.model;

import app.hopps.fin.jpa.entities.TradeParty;
import app.hopps.fin.jpa.entities.TransactionRecord;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

public record ReceiptData(
        BigDecimal total,
        Optional<String> storeName,
        Optional<TradeParty> storeAddress,
        Optional<LocalDateTime> transactionTime) implements Data {

    public ReceiptData(BigDecimal total) {
        this(total, Optional.empty(), Optional.empty(), Optional.empty());
    }

    @Override
    public void updateTransactionRecord(TransactionRecord transactionRecord) {
        transactionRecord.setTotal(this.total());

        // Optional
        this.storeName().ifPresent(transactionRecord::setName);
        this.storeAddress().ifPresent(transactionRecord::setSender);
        this.transactionTime()
                .ifPresent(
                        transactionTime -> transactionRecord
                                .setTransactionTime(transactionTime.toInstant(ZoneOffset.UTC)));
    }
}
