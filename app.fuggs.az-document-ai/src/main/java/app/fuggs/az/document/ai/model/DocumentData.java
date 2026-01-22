package app.fuggs.az.document.ai.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record DocumentData(
	BigDecimal total,
	String currencyCode,
	LocalDate date,
	LocalTime time,
	String documentId,
	String merchantName,
	TradeParty merchantAddress,
	String merchantTaxId,
	String customerName,
	String customerId,
	TradeParty customerAddress,
	TradeParty billingAddress,
	TradeParty shippingAddress,
	LocalDate dueDate,
	BigDecimal amountDue,
	BigDecimal subTotal,
	BigDecimal totalTax,
	BigDecimal totalDiscount,
	BigDecimal previousUnpaidBalance,
	String purchaseOrderNumber,
	String paymentTerm,
	LocalDate serviceStartDate,
	LocalDate serviceEndDate,
	List<String> tags)
{
}
