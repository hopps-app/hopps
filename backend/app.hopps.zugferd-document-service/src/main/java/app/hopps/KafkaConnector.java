package app.hopps;

import app.hopps.model.InvoiceData;
import app.hopps.model.InvoiceDocument;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.eclipse.microprofile.reactive.messaging.Outgoing;

import javax.xml.xpath.XPathExpressionException;
import java.io.IOException;
import java.text.ParseException;

@ApplicationScoped
public class KafkaConnector {

    @Inject
    ZugFerdService zugFerdService;

    @Inject
    DocumentDownloader documentDownloader;

    @Incoming("document-URL-in")
    @Outgoing("document-data-out")
    public InvoiceData process(InvoiceDocument invoiceDocument) {
        // Process the incoming message payload and return an updated payload
        try {
            return zugFerdService.scanInvoice(documentDownloader.downloadDocument(invoiceDocument.URL()));
        } catch (RuntimeException | IOException | XPathExpressionException | ParseException e) {
            throw new RuntimeException(e);
        }
    }
}
