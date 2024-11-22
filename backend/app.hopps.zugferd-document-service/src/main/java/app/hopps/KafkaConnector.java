package app.hopps;

import app.hopps.model.InvoiceData;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.eclipse.microprofile.reactive.messaging.Incoming;

import javax.xml.xpath.XPathExpressionException;
import java.text.ParseException;

@ApplicationScoped
public class KafkaConnector {

    @Inject
    @Channel("invoices-out")
    Emitter<InvoiceData> invoiceDataEmitter;

    @Inject
    ZugFerdService zugFerdService;

    @Incoming("invoices-in")
    public void scanInvoices(String invoiceUrl) throws XPathExpressionException, ParseException {
        invoiceDataEmitter.send(zugFerdService.scanInvoice(invoiceUrl));
    }
}
