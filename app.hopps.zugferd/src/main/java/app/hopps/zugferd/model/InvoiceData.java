package app.hopps.zugferd.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

public record InvoiceData(
	BigDecimal total,
	LocalDate invoiceDate,
	String currencyCode,
	Optional<String> customerName,
	Optional<String> purchaseOrderNumber,
	Optional<String> invoiceId,
	Optional<LocalDate> dueDate,
	Optional<BigDecimal> amountDue,
	Optional<TradeParty> sender,
	Optional<TradeParty> receiver)
{
	public InvoiceData(Long referenceKey, BigDecimal total, LocalDate invoiceDate, String currencyCode)
	{
		this(total, invoiceDate, currencyCode,
			Optional.empty(),
			Optional.empty(),
			Optional.empty(),
			Optional.empty(),
			Optional.empty(),
			Optional.empty(),
			Optional.empty());
	}
}
