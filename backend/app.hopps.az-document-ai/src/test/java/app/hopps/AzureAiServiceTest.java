package app.hopps;

import app.hopps.model.InvoiceData;
import com.azure.ai.documentintelligence.models.AddressValue;
import com.azure.ai.documentintelligence.models.AnalyzeResult;
import com.azure.ai.documentintelligence.models.Document;
import com.azure.ai.documentintelligence.models.DocumentField;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;

@QuarkusTest
class AzureAiServiceTest {

    @Inject
    AzureAiService aiService;

    @InjectMock
    AzureDocumentConnector azureConnector;

    @Test
    public void oneDocumentFunctions() throws URISyntaxException, MalformedURLException {
        Document document = getFakeDocuments().getFirst();

        AnalyzeResult analyzeResult = Mockito.mock(AnalyzeResult.class);
        Mockito.when(analyzeResult.getDocuments())
                    .thenReturn(List.of(document));

        Mockito.when(azureConnector.getAnalyzeResult(anyString(), any()))
                .thenReturn(analyzeResult);

        InvoiceData invoiceData = aiService.scanInvoice(new URI("https://something.test/what").toURL());

        Assertions.assertNotNull(invoiceData);
    }

    @Test
    public void failsGracefullyWithZeroDocuments() throws URISyntaxException, MalformedURLException {
        AnalyzeResult analyzeResult = Mockito.mock(AnalyzeResult.class);
        Mockito.when(analyzeResult.getDocuments())
                .thenReturn(List.of());

        Mockito.when(azureConnector.getAnalyzeResult(anyString(), any()))
                .thenReturn(analyzeResult);

        InvoiceData invoiceData = aiService.scanInvoice(new URI("https://something.test/what").toURL());

        Assertions.assertNull(invoiceData);
    }

    @Test
    public void useFirstDocumentWhenAzureReturnsMultiple() throws URISyntaxException, MalformedURLException {
        var documents = getFakeDocuments();

        AnalyzeResult analyzeResult = Mockito.mock(AnalyzeResult.class);
        Mockito.when(analyzeResult.getDocuments())
                .thenReturn(documents);

        Mockito.when(azureConnector.getAnalyzeResult(anyString(), any()))
                .thenReturn(analyzeResult);

        InvoiceData invoiceData = aiService.scanInvoice(new URI("https://something.test/what").toURL());

        Assertions.assertNotNull(invoiceData);
        Assertions.assertEquals(100d, invoiceData.total());
    }

    /**
     * Generates three fake documents,
     * only differing by the "total" field.
     * Total values are 100, 200, 300
     */
    private static List<Document> getFakeDocuments() {
        List<Document> documents = new ArrayList<>();

        for (int i = 1; i < 4; i++) {
            var total = Mockito.mock(DocumentField.class);
            Mockito.when(total.getValueCurrency().getAmount())
                    .thenReturn(100d * i);

            var currencyCode = Mockito.mock(DocumentField.class);
            Mockito.when(currencyCode.getValueString())
                    .thenReturn("EUR");

            var addressValue = Mockito.mock(AddressValue.class);
            Mockito.when(addressValue.getCity())
                    .thenReturn("Pfaffenhofen");

            var billingAddress = Mockito.mock(DocumentField.class);
            Mockito.when(billingAddress.getValueAddress())
                    .thenReturn(addressValue);

            var fields = Map.of(
                "InvoiceTotal", total,
                "CurrencyCode", currencyCode,
                "BillingAddress", billingAddress
            );

            Document document = Mockito.mock(Document.class);
            Mockito.when(document.getFields())
                        .thenReturn(fields);

            documents.add(document);
        }

        return documents;
    }

}