package app.hopps.az.document.ai.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

public record ReceiptData(
        Long referenceKey,
        BigDecimal total,
        Optional<String> storeName,
        Optional<TradeParty> storeAddress,
        Optional<LocalDateTime> transactionTime) {

}
