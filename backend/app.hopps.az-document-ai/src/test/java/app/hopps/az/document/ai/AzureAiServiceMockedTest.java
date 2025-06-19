package app.hopps.az.document.ai;

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
import java.nio.file.Path;

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
        when(azureDocumentConnector.getAnalyzeResult(anyString(), any(Path.class)))
                .thenReturn(mockAnalyzeResult);
    }

    @Disabled("we currently don't know of a way to create an AnalyzeResult")
    @Test
    void shouldAnalyzeInvoiceAgainstMock() throws Exception {
        // given
        String url = "https://formrecognizer.appliedai.azure.com/documents/samples/prebuilt/receipt.png";
        // DocumentData documentData = new DocumentData(new URI(url).toURL(), -1L, DocumentType.INVOICE);

        // when

        // scanInvoice now takes a FileUpload as an argument - since this test is currently unused,
        // I've decided not to fix this.

        // Optional<InvoiceData> invoiceData = aiService.scanInvoice(documentData);

        // then
        // assertNotNull(invoiceData);
        // assertTrue(invoiceData.isPresent());
    }
}
