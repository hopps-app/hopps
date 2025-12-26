package app.hopps.zugferd;

import app.hopps.zugferd.model.DocumentData;
import app.hopps.zugferd.model.DocumentDataHandler;
import jakarta.enterprise.context.ApplicationScoped;
import org.mustangproject.Invoice;
import org.mustangproject.ZUGFeRD.ZUGFeRDInvoiceImporter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.xml.xpath.XPathExpressionException;
import java.io.InputStream;
import java.text.ParseException;

@ApplicationScoped
public class ZugFerdService
{
	private static final Logger LOG = LoggerFactory.getLogger(ZugFerdService.class);

	public DocumentData scanDocument(Long transactionRecordId, InputStream stream)
		throws XPathExpressionException, ParseException
	{
		LOG.info("Starting scan of document (transactionRecordId={})", transactionRecordId);
		ZUGFeRDInvoiceImporter zii = new ZUGFeRDInvoiceImporter(stream);
		Invoice invoice = zii.extractInvoice();
		LOG.info("Successfully extracted invoice from PDF (transactionRecordId={})", transactionRecordId);
		return DocumentDataHandler.fromZugferd(invoice);
	}
}
