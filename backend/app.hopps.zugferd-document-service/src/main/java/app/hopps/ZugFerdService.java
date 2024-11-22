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

    public InvoiceData scanInvoice(String invoiceURL) throws XPathExpressionException, ParseException {
        ZUGFeRDInvoiceImporter zii = new ZUGFeRDInvoiceImporter(invoiceURL);
        Invoice invoice = zii.extractInvoice();
        return InvoiceData.fromZugferd(invoice);
    }
}
