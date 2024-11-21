package app.hopps;

import app.hopps.model.InvoiceData;
import org.mustangproject.Invoice;
import org.mustangproject.ZUGFeRD.ZUGFeRDInvoiceImporter;
import jakarta.enterprise.context.ApplicationScoped;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.xml.xpath.XPathExpressionException;
import java.text.ParseException;

@ApplicationScoped
public class ZugFerdService {

    private final Logger LOGGER = LoggerFactory.getLogger(ZugFerdService.class);

    public InvoiceData scanInvoice(String invoiceURL) {
        ZUGFeRDInvoiceImporter zii = new ZUGFeRDInvoiceImporter(invoiceURL);
        Invoice invoice;

        try {
            invoice = zii.extractInvoice();
        } catch (XPathExpressionException | ParseException e) {
            LOGGER.info("Scan was not successful");
            throw new RuntimeException(e);
        }

        LOGGER.info("Invoice scanned successfully");

        return InvoiceData.fromZugferd(invoice);
    }
}
