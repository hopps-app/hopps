package app.hopps;

import app.hopps.model.InvoiceData;
import org.mustangproject.Invoice;
import org.mustangproject.ZUGFeRD.ZUGFeRDInvoiceImporter;
import jakarta.enterprise.context.ApplicationScoped;

import javax.xml.xpath.XPathExpressionException;
import java.io.InputStream;
import java.text.ParseException;

@ApplicationScoped
public class ZugFerdService {

    public InvoiceData scanInvoice(InputStream stream) throws XPathExpressionException, ParseException {
        ZUGFeRDInvoiceImporter zii = new ZUGFeRDInvoiceImporter(stream);
        Invoice invoice = zii.extractInvoice();
        return InvoiceData.fromZugferd(invoice);
    }
}
