package app.hopps.zugferd;

import app.hopps.zugferd.model.DocumentData;
import app.hopps.zugferd.model.DocumentDataHandler;
import jakarta.enterprise.context.ApplicationScoped;
import org.mustangproject.Invoice;
import org.mustangproject.ZUGFeRD.ZUGFeRDImporter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.xml.xpath.XPathExpressionException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.text.ParseException;

@ApplicationScoped
public class ZugFerdService
{
	private static final Logger LOG = LoggerFactory.getLogger(ZugFerdService.class);

	public DocumentData scanDocument(Long transactionRecordId, InputStream stream)
		throws XPathExpressionException, ParseException
	{
		LOG.info("Starting scan of document (transactionRecordId={})", transactionRecordId);
		ZUGFeRDImporter importer = new ZUGFeRDImporter();
		importer.doIgnoreCalculationErrors(); // Ignore validation errors for
												// incomplete invoices
		importer.setInputStream(stream);
		Invoice invoice = importer.extractInvoice();
		// Get values directly from the importer (reads from XML header)
		// because TransactionCalculator returns 0 when calculation errors are
		// ignored
		BigDecimal grandTotal = parseBigDecimal(importer.getAmount());
		BigDecimal totalTax = parseBigDecimal(importer.getTaxTotalAmount());
		BigDecimal taxBasis = parseBigDecimal(importer.getTaxBasisTotalAmount());
		LOG.info(
			"Successfully extracted invoice from PDF (transactionRecordId={}, grandTotal={}, totalTax={})",
			transactionRecordId, grandTotal, totalTax);
		return DocumentDataHandler.fromZugferd(invoice, grandTotal, totalTax, taxBasis);
	}

	private BigDecimal parseBigDecimal(String value)
	{
		if (value == null || value.isEmpty())
		{
			return null;
		}
		return new BigDecimal(value);
	}
}
