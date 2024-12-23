package app.hopps;

import app.hopps.model.InvoiceData;
import app.hopps.model.InvoiceDocument;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.eclipse.microprofile.reactive.messaging.Outgoing;

import javax.xml.xpath.XPathExpressionException;
import java.io.IOException;
import java.net.URISyntaxException;
import java.text.ParseException;

@ApplicationScoped
public class KafkaConnector {

    @Inject
    ZugFerdService zugFerdService;

    @Inject
    DocumentDownloader documentDownloader;

    @Incoming("document-uri-in")
    @Outgoing("document-data-out")
    public InvoiceData process(InvoiceDocument invoiceDocument) {
        // Process the incoming message payload and return an updated payload
        try {
            return zugFerdService.scanInvoice(documentDownloader.downloadDocument(invoiceDocument.URI()));
        } catch (RuntimeException | IOException | XPathExpressionException | ParseException | URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }
}
