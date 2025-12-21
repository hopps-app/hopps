package app.hopps.document.client;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ReceiptData(
	BigDecimal total,
	String storeName,
	TradePartyData storeAddress,
	LocalDateTime transactionTime)
{
}
