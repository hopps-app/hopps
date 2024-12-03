package app.hopps;

import app.hopps.model.*;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;

import io.smallrye.reactive.messaging.memory.InMemorySink;
import io.smallrye.reactive.messaging.memory.InMemorySource;
import org.eclipse.microprofile.reactive.messaging.spi.Connector;
import org.junit.jupiter.api.Test;

import jakarta.inject.Inject;
import io.smallrye.reactive.messaging.memory.InMemoryConnector;
import org.mockito.Mockito;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.LocalDate;
import java.util.Optional;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@QuarkusTest
@QuarkusTestResource(KafkaTestResourceLifecycleManager.class)
class DocumentKafkaConnectorTest {

    @Inject
    @Connector("smallrye-in-memory")
    InMemoryConnector connector;

    @InjectMock
    AzureAiService azureAiServiceMock;

    @Test
    public void onlySendsToInvoices() throws URISyntaxException, MalformedURLException {

        InvoiceData invoiceData = fakeInvoiceData();

        DocumentImage documentImage = new DocumentImage(
                new URI("http://something.test/picture").toURL(),
                DocumentType.Invoice
        );

        when(azureAiServiceMock.scanInvoice(Mockito.any()))
                .thenReturn(invoiceData);
        when(azureAiServiceMock.scanReceipt(Mockito.any()))
                .thenReturn(null);

        InMemorySource<DocumentImage> ordersIn = connector.source("documents-in");
        InMemorySink<InvoiceData> invoiceOut = connector.sink("invoices-out");
        InMemorySink<ReceiptData> receiptsOut = connector.sink("receipts-out");

        // Act
        ordersIn.send(documentImage);

        // Assert
        await().until(invoiceOut::received, t -> t.size() == 1);

        InvoiceData actual = invoiceOut.received().getFirst().getPayload();
        assertEquals(invoiceData, actual);

        assertEquals(receiptsOut.received().size(), 0);
    }

    private static InvoiceData fakeInvoiceData() {
        return new InvoiceData(
                Optional.of("Test customer"),
                Optional.of(fakeAddress()),
                Optional.empty(),
                Optional.empty(),
                LocalDate.now(),
                Optional.empty(),
                Optional.empty(),
                135.0,
                Optional.empty(),
                "EUR"
        );
    }

    private static Address fakeAddress() {
        return new Address(
            "Germany",
            "85276",
            "Bavaria",
            "Pfaffenhofen",
            "Bistumerweg",
            "5"
        );
    }

}
