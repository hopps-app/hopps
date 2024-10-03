package app.hopps;

import app.hopps.model.InvoiceData;
import com.azure.ai.documentintelligence.models.AnalyzeResult;
import com.azure.json.JsonSerializable;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.quarkus.test.InjectMock;
import io.quarkus.test.Mock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@QuarkusTest
class AzureAiServiceMockedTest {

    @Inject
    AzureAiService aiService;

    @InjectMock
    AzureDocumentConnector azureDocumentConnector;

    @BeforeEach
    void setupMocks() throws IOException {
        InputStream stream = getClass().getClassLoader().getResourceAsStream("sample-receipt-01.json");
        ObjectMapper objectMapper = new ObjectMapper();
        AnalyzeResult mockAnalyzeResult = objectMapper.readValue(stream, AnalyzeResult.class);;
        when(azureDocumentConnector.getAnalyzeResult(anyString(), any(URL.class)))
            .thenReturn(mockAnalyzeResult);
    }

    @Test
    void shouldAnalyzeInvoiceAgainstMock() throws Exception {

        // given
        String url = "https://formrecognizer.appliedai.azure.com/documents/samples/prebuilt/receipt.png";

        // when
        InvoiceData invoiceData = aiService.scanInvoice(new URI(url).toURL());

        //then
        assertNotNull(invoiceData);
    }
}