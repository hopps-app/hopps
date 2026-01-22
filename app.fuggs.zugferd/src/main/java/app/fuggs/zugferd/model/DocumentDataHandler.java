package app.fuggs.zugferd.model;

import org.mustangproject.Invoice;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;

public class DocumentDataHandler
{
	private DocumentDataHandler()
	{
		// only call the static method
	}

	public static DocumentData fromZugferd(Invoice invoice, BigDecimal grandTotal,
		BigDecimal totalTax, BigDecimal taxBasis, List<String> tags)
	{
		// Values are passed from ZUGFeRDImporter because TransactionCalculator
		// returns 0 when calculation errors are ignored (e.g., when line items
		// don't sum to header total)
		BigDecimal amountDue = grandTotal;
		if (grandTotal != null && invoice.getTotalPrepaidAmount() != null)
		{
			amountDue = grandTotal.subtract(invoice.getTotalPrepaidAmount());
		}

		org.mustangproject.TradeParty sender = invoice.getSender();
		org.mustangproject.TradeParty recipient = invoice.getRecipient() != null
			? invoice.getRecipient()
			: invoice.getPayee();

		return new DocumentData(
			grandTotal,
			invoice.getCurrency(),
			toLocalDate(invoice.getIssueDate()),
			null, // time - not available in ZUGFeRD
			invoice.getNumber(),
			sender != null ? sender.getName() : null,
			sender != null ? TradePartyHelper.fromTradeParty(sender) : null,
			sender != null ? sender.getTaxID() : null,
			recipient != null ? recipient.getName() : null,
			null, // customerId - not available in ZUGFeRD
			recipient != null ? TradePartyHelper.fromTradeParty(recipient) : null,
			null, // billingAddress - not separately available
			null, // shippingAddress - not separately available
			toLocalDate(invoice.getDueDate()),
			amountDue,
			taxBasis, // subTotal (net amount before tax)
			totalTax, // totalTax (MwSt)
			null, // totalDiscount - not directly available
			invoice.getTotalPrepaidAmount(),
			invoice.getReferenceNumber(),
			null, // paymentTerm - not directly available
			null, // serviceStartDate - not directly available
			null, // serviceEndDate - not directly available
			tags);
	}

	private static LocalDate toLocalDate(Date date)
	{
		if (date == null)
		{
			return null;
		}
		return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
	}
}
