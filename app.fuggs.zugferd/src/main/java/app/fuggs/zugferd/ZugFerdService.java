package app.fuggs.zugferd;

import java.io.InputStream;
import java.math.BigDecimal;
import java.text.ParseException;
import java.util.List;

import javax.xml.xpath.XPathExpressionException;

import org.mustangproject.Invoice;
import org.mustangproject.ZUGFeRD.ZUGFeRDImporter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.fuggs.zugferd.model.DocumentData;
import app.fuggs.zugferd.model.DocumentDataHandler;
import app.fuggs.zugferd.service.TagGenerationService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class ZugFerdService
{
	private static final Logger LOG = LoggerFactory.getLogger(ZugFerdService.class);

	@Inject
	TagGenerationService tagGenerationService;

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

		// Generate AI-powered tags for the invoice
		List<String> tags = tagGenerationService.generateTagsForInvoice(invoice);

		return DocumentDataHandler.fromZugferd(invoice, grandTotal, totalTax, taxBasis, tags);
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
