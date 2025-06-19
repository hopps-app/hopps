package app.hopps.zugferd;

import app.hopps.zugferd.model.InvoiceData;
import app.hopps.zugferd.model.InvoiceDataHandler;
import jakarta.enterprise.context.ApplicationScoped;
import org.mustangproject.Invoice;
import org.mustangproject.ZUGFeRD.ZUGFeRDInvoiceImporter;

import javax.xml.xpath.XPathExpressionException;
import java.io.InputStream;
import java.text.ParseException;

@ApplicationScoped
public class ZugFerdService {

    public InvoiceData scanInvoice(Long referenceKey, InputStream stream)
            throws XPathExpressionException, ParseException {

        ZUGFeRDInvoiceImporter zii = new ZUGFeRDInvoiceImporter(stream);
        Invoice invoice = zii.extractInvoice();
        return InvoiceDataHandler.fromZugferd(referenceKey, invoice);
    }
}
