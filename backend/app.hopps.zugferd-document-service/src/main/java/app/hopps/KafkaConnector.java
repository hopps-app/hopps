package app.hopps;

import app.hopps.model.InvoiceData;
import app.hopps.model.InvoiceDocument;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.eclipse.microprofile.reactive.messaging.Outgoing;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@ApplicationScoped
public class KafkaConnector {

    @Inject
    ZugFerdService zugFerdService;

    @Inject
    DocumentDownloader documentDownloader;

    private final Logger LOG = LoggerFactory.getLogger(KafkaConnector.class);

    @Incoming("document-uri-in")
    @Outgoing("document-data-out")
    public InvoiceData process(InvoiceDocument invoiceDocument) {
        // Process the incoming message payload and return an updated payload
        try {
            return zugFerdService.scanInvoice(documentDownloader.downloadDocument(invoiceDocument.URI()));
        } catch (Exception e) {
            LOG.error(e.toString());
        }
        return null;
    }
}
