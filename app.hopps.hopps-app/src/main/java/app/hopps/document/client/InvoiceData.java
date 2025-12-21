package app.hopps.document.client;

import java.math.BigDecimal;
import java.time.LocalDate;

public record InvoiceData(
	BigDecimal total,
	LocalDate invoiceDate,
	String currencyCode,
	String customerName,
	String purchaseOrderNumber,
	String invoiceId,
	LocalDate dueDate,
	BigDecimal amountDue,
	TradePartyData sender,
	TradePartyData receiver)
{
}
