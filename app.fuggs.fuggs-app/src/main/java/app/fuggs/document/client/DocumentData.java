package app.fuggs.document.client;

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
	TradePartyData merchantAddress,
	String merchantTaxId,
	String customerName,
	String customerId,
	TradePartyData customerAddress,
	TradePartyData billingAddress,
	TradePartyData shippingAddress,
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
