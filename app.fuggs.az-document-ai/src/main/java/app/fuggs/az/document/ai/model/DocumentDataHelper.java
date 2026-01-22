package app.fuggs.az.document.ai.model;

import com.azure.ai.documentintelligence.models.AnalyzedDocument;
import com.azure.ai.documentintelligence.models.CurrencyValue;
import com.azure.ai.documentintelligence.models.DocumentField;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public class DocumentDataHelper
{
	private static final Logger LOG = LoggerFactory.getLogger(DocumentDataHelper.class);

	private DocumentDataHelper()
	{
	}

	public static DocumentData fromDocument(AnalyzedDocument document, List<String> tags)
	{
		Map<String, DocumentField> fields = document.getFields();
		LOG.debug("Document fields: {}", fields.keySet());

		BigDecimal subTotal = extractCurrency(fields, "SubTotal");
		BigDecimal totalTax = extractCurrency(fields, "TotalTax");
		BigDecimal total = extractTotal(fields, subTotal, totalTax);

		return new DocumentData(
			total,
			extractCurrencyCode(fields),
			extractDate(fields),
			extractTime(fields),
			extractString(fields, "InvoiceId"),
			extractMerchantName(fields),
			extractMerchantAddress(fields),
			extractString(fields, "VendorTaxId"),
			extractString(fields, "CustomerName"),
			extractString(fields, "CustomerId"),
			extractAddress(fields, "CustomerAddress"),
			extractAddress(fields, "BillingAddress"),
			extractAddress(fields, "ShippingAddress"),
			extractLocalDate(fields, "DueDate"),
			extractCurrency(fields, "AmountDue"),
			subTotal,
			totalTax,
			extractCurrency(fields, "TotalDiscount"),
			extractCurrency(fields, "PreviousUnpaidBalance"),
			extractString(fields, "PurchaseOrder"),
			extractString(fields, "PaymentTerm"),
			extractLocalDate(fields, "ServiceStartDate"),
			extractLocalDate(fields, "ServiceEndDate"),
			tags);
	}

	private static BigDecimal extractTotal(Map<String, DocumentField> fields, BigDecimal subTotal,
		BigDecimal totalTax)
	{
		// Azure sometimes mislabels fields - InvoiceTotal might be Netto,
		// SubTotal
		// might be Brutto
		// Since Brutto >= Netto always, we use the maximum of available values

		BigDecimal invoiceTotal = null;
		DocumentField invoiceTotalField = fields.get("InvoiceTotal");
		if (invoiceTotalField != null && invoiceTotalField.getValueCurrency() != null)
		{
			invoiceTotal = BigDecimal.valueOf(invoiceTotalField.getValueCurrency().getAmount());
		}

		BigDecimal total = null;
		DocumentField totalField = fields.get("Total");
		if (totalField != null && totalField.getValueCurrency() != null)
		{
			total = BigDecimal.valueOf(totalField.getValueCurrency().getAmount());
		}

		// Find the maximum of all available values - Brutto is always the
		// largest
		BigDecimal result = max(invoiceTotal, subTotal, total);

		if (result != null)
		{
			LOG.debug("Extracted total (Brutto): {} (from InvoiceTotal={}, SubTotal={}, Total={})", result,
				invoiceTotal, subTotal, total);
			return result;
		}

		return null;
	}

	private static BigDecimal max(BigDecimal... values)
	{
		BigDecimal result = null;
		for (BigDecimal value : values)
		{
			if (value != null && (result == null || value.compareTo(result) > 0))
			{
				result = value;
			}
		}
		return result;
	}

	private static String extractCurrencyCode(Map<String, DocumentField> fields)
	{
		DocumentField field = fields.get("CurrencyCode");
		if (field != null && field.getValueString() != null)
		{
			return field.getValueString();
		}

		DocumentField totalField = fields.get("InvoiceTotal");
		if (totalField == null)
		{
			totalField = fields.get("Total");
		}
		if (totalField != null && totalField.getValueCurrency() != null)
		{
			CurrencyValue currency = totalField.getValueCurrency();
			if (currency.getCurrencyCode() != null)
			{
				return currency.getCurrencyCode();
			}
		}
		return null;
	}

	private static LocalDate extractDate(Map<String, DocumentField> fields)
	{
		DocumentField dateField = fields.get("InvoiceDate");
		if (dateField == null)
		{
			dateField = fields.get("TransactionDate");
		}
		if (dateField != null)
		{
			return dateField.getValueDate();
		}
		return null;
	}

	private static LocalTime extractTime(Map<String, DocumentField> fields)
	{
		DocumentField field = fields.get("TransactionTime");
		if (field != null && field.getValueTime() != null)
		{
			return LocalTime.parse(field.getValueTime());
		}
		return null;
	}

	private static String extractMerchantName(Map<String, DocumentField> fields)
	{
		DocumentField field = fields.get("VendorName");
		if (field == null)
		{
			field = fields.get("MerchantName");
		}
		if (field != null)
		{
			return field.getValueString();
		}
		return null;
	}

	private static TradeParty extractMerchantAddress(Map<String, DocumentField> fields)
	{
		DocumentField field = fields.get("VendorAddress");
		if (field == null)
		{
			field = fields.get("MerchantAddress");
		}
		if (field != null && field.getValueAddress() != null)
		{
			return TradePartyHelper.fromAzure(field.getValueAddress());
		}
		return null;
	}

	private static String extractString(Map<String, DocumentField> fields, String fieldName)
	{
		DocumentField field = fields.get(fieldName);
		if (field != null)
		{
			return field.getValueString();
		}
		return null;
	}

	private static LocalDate extractLocalDate(Map<String, DocumentField> fields, String fieldName)
	{
		DocumentField field = fields.get(fieldName);
		if (field != null)
		{
			return field.getValueDate();
		}
		return null;
	}

	private static BigDecimal extractCurrency(Map<String, DocumentField> fields, String fieldName)
	{
		DocumentField field = fields.get(fieldName);
		if (field != null && field.getValueCurrency() != null)
		{
			return BigDecimal.valueOf(field.getValueCurrency().getAmount());
		}
		return null;
	}

	private static TradeParty extractAddress(Map<String, DocumentField> fields, String fieldName)
	{
		DocumentField field = fields.get(fieldName);
		if (field != null && field.getValueAddress() != null)
		{
			return TradePartyHelper.fromAzure(field.getValueAddress());
		}
		return null;
	}
}
