package app.hopps.zugferd.model;

import org.mustangproject.Invoice;
import org.mustangproject.ZUGFeRD.TransactionCalculator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collections;
import java.util.Date;

public class DocumentDataHandler
{
	private DocumentDataHandler()
	{
		// only call the static method
	}

	public static DocumentData fromZugferd(Invoice invoice)
	{
		TransactionCalculator tc = new TransactionCalculator(invoice);

		BigDecimal grandTotal = tc.getGrandTotal();
		BigDecimal amountDue = grandTotal;
		if (invoice.getTotalPrepaidAmount() != null)
		{
			amountDue = amountDue.subtract(invoice.getTotalPrepaidAmount());
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
			null, // subTotal - could calculate but not directly available
			null, // totalTax - not directly available
			null, // totalDiscount - not directly available
			invoice.getTotalPrepaidAmount(),
			invoice.getReferenceNumber(),
			null, // paymentTerm - not directly available
			null, // serviceStartDate - not directly available
			null, // serviceEndDate - not directly available
			Collections.emptyList() // tags - no AI in ZUGFeRD extraction
		);
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
