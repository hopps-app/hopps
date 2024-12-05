package app.hopps;

import app.hopps.model.InvoiceData;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.eclipse.microprofile.reactive.messaging.Outgoing;

import javax.xml.xpath.XPathExpressionException;
import java.io.InputStream;
import java.text.ParseException;

@ApplicationScoped
public class KafkaConnector {

    @Inject
    ZugFerdService zugFerdService;

    @Incoming("invoice-document-in")
    @Outgoing("invoice-document-out")
    public InvoiceData process(InputStream inputStream) throws XPathExpressionException, ParseException {
        // Process the incoming message payload and return an updated payload
        return zugFerdService.scanInvoice(inputStream);
    }
}
