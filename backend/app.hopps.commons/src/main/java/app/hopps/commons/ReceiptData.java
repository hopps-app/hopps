package app.hopps.commons;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

public record ReceiptData(
        Long referenceKey,
        BigDecimal total,
        Optional<String> storeName,
        Optional<TradeParty> storeAddress,
        Optional<LocalDateTime> transactionTime) implements Data {

    public ReceiptData(Long referenceKey, BigDecimal total) {
        this(referenceKey, total, Optional.empty(), Optional.empty(), Optional.empty());
    }
}
