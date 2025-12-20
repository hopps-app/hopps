package app.hopps.zugferd;

import app.hopps.zugferd.model.InvoiceData;
import app.hopps.zugferd.model.InvoiceDataHandler;
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
	private static final Logger LOGGER = LoggerFactory.getLogger(ZugFerdService.class);

	public InvoiceData scanInvoice(Long referenceKey, InputStream stream)
		throws XPathExpressionException, ParseException
	{
		LOGGER.info("Starting scan of invoice (referenceKey={})", referenceKey);
		ZUGFeRDInvoiceImporter zii = new ZUGFeRDInvoiceImporter(stream);
		Invoice invoice = zii.extractInvoice();
		LOGGER.info("Successfully extracted invoice from pdf (referenceKey={})", referenceKey);
		return InvoiceDataHandler.fromZugferd(invoice);
	}
}
