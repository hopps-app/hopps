package app.hopps;

import app.hopps.commons.DocumentData;
import app.hopps.commons.InvoiceData;
import app.hopps.commons.ReceiptData;
import app.hopps.commons.TradeParty;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.smallrye.reactive.messaging.memory.InMemoryConnector;
import io.smallrye.reactive.messaging.memory.InMemorySink;
import io.smallrye.reactive.messaging.memory.InMemorySource;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.spi.Connector;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.LocalDate;
import java.util.Optional;

import static app.hopps.commons.DocumentType.INVOICE;
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
    void onlySendsToInvoices() throws URISyntaxException, MalformedURLException {

        InvoiceData invoiceData = fakeInvoiceData();

        DocumentData documentData = new DocumentData(
                new URI("http://something.test/picture").toURL(),
                1L,
                INVOICE);

        when(azureAiServiceMock.scanInvoice(Mockito.any()))
                .thenReturn(invoiceData);
        when(azureAiServiceMock.scanReceipt(Mockito.any()))
                .thenReturn(null);

        InMemorySource<DocumentData> ordersIn = connector.source("documents-in");
        InMemorySink<InvoiceData> invoiceOut = connector.sink("invoices-out");
        InMemorySink<ReceiptData> receiptsOut = connector.sink("receipts-out");

        // Act
        ordersIn.send(documentData);

        // Assert
        await().until(invoiceOut::received, t -> t.size() == 1);

        InvoiceData actual = invoiceOut.received().getFirst().getPayload();
        assertEquals(invoiceData, actual);

        assertEquals(0, receiptsOut.received().size());
    }

    private static InvoiceData fakeInvoiceData() {
        return new InvoiceData(
                0L,
                BigDecimal.valueOf(135.0),
                LocalDate.now(),
                "EUR",
                Optional.of("Test customer"),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.of(fakeAddress()),
                Optional.empty());
    }

    private static TradeParty fakeAddress() {
        return new TradeParty(
                null,
                "Germany",
                "85276",
                "Bavaria",
                "Pfaffenhofen",
                "Bistumerweg",
                "5",
                null,
                null,
                null);
    }

}
