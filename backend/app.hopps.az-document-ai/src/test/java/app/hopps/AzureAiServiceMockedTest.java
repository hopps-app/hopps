package app.hopps;

import app.hopps.commons.DocumentData;
import app.hopps.commons.DocumentType;
import app.hopps.commons.InvoiceData;
import com.azure.ai.documentintelligence.models.AnalyzeResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@QuarkusTest
@Disabled
class AzureAiServiceMockedTest {

    @Inject
    AzureAiService aiService;

    @InjectMock
    AzureDocumentConnector azureDocumentConnector;

    // FIXME: this doesn't work, we currently don't know of a way to create an AnalyzeResult,
    // if there is a way please create the object and put it into the mock.
    @BeforeEach
    void setupMocks() throws IOException {
        InputStream stream = getClass().getClassLoader().getResourceAsStream("sample-receipt-01.json");
        ObjectMapper objectMapper = new ObjectMapper();
        AnalyzeResult mockAnalyzeResult = objectMapper.readValue(stream, AnalyzeResult.class);
        when(azureDocumentConnector.getAnalyzeResult(anyString(), any(URL.class)))
                .thenReturn(mockAnalyzeResult);
    }

    @Disabled
    @Test
    void shouldAnalyzeInvoiceAgainstMock() throws Exception {

        // given
        String url = "https://formrecognizer.appliedai.azure.com/documents/samples/prebuilt/receipt.png";
        DocumentData documentData = new DocumentData(new URI(url).toURL(), -1L, DocumentType.INVOICE);

        // when
        InvoiceData invoiceData = aiService.scanInvoice(documentData);

        // then
        assertNotNull(invoiceData);
    }
}
