package app.hopps;

import app.hopps.model.InvoiceData;
import app.hopps.model.DocumentImage;
import app.hopps.model.ReceiptData;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.*;

import jakarta.enterprise.context.ApplicationScoped;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@ApplicationScoped
public class DocumentKafkaConnector {
    private Logger LOGGER = LoggerFactory.getLogger(DocumentKafkaConnector.class);

    @Inject
    @Channel("invoices-out")
    Emitter<InvoiceData> invoicesEmitter;

    @Inject
    @Channel("receipts-out")
    Emitter<ReceiptData> receiptEmitter;

    @Inject
    AzureAiService azureAi;

    @Incoming("documents-in")
    public void scanDocument(DocumentImage message) {
        var image = message.imageUrl();
        switch (message.documentType()) {
            case Receipt -> {
                var receipt = azureAi.scanReceipt(image);
                if (receipt != null) {
                    receiptEmitter.send(receipt);
                } else {
                    LOGGER.error("Document analysis failed for receipt");
                }
            }
            case Invoice -> {
                var invoice = azureAi.scanInvoice(image);
                if (invoice != null) {
                    invoicesEmitter.send(invoice);
                } else {
                    LOGGER.error("Document analysis failed for invoice");
                }
            }
        }
    }
}
