package app.hopps;

import app.hopps.commons.DocumentData;
import app.hopps.commons.DocumentType;
import app.hopps.commons.InvoiceData;
import app.hopps.commons.ReceiptData;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@ApplicationScoped
public class DocumentKafkaConnector {
    private static final Logger LOG = LoggerFactory.getLogger(DocumentKafkaConnector.class);

    private final AzureAiService azureAi;
    private final Emitter<InvoiceData> invoicesEmitter;
    private final Emitter<ReceiptData> receiptEmitter;

    @Inject
    public DocumentKafkaConnector(AzureAiService azureAi, @Channel("receipts-out") Emitter<ReceiptData> receiptEmitter,
            @Channel("invoices-out") Emitter<InvoiceData> invoicesEmitter) {
        this.invoicesEmitter = invoicesEmitter;
        this.receiptEmitter = receiptEmitter;
        this.azureAi = azureAi;
    }

    @Incoming("documents-in")
    public void scanDocument(DocumentData message) {
        if (message.type() == DocumentType.RECEIPT) {
            var receipt = azureAi.scanReceipt(message);
            if (receipt != null) {
                receiptEmitter.send(receipt);
            } else {
                LOG.error("Document analysis failed for receipt");
            }
        } else if (message.type() == DocumentType.INVOICE) {
            var invoice = azureAi.scanInvoice(message);
            if (invoice != null) {
                invoicesEmitter.send(invoice);
            } else {
                LOG.error("Document analysis failed for invoice");
            }
        }
    }
}
