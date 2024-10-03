package app.hopps;

import app.hopps.model.InvoiceData;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;

@QuarkusTest
class AzureAiServiceTest {

    @Inject
    AzureAiService aiService;

    @Test
    @Tag("azure")
    void shouldAnalyzeInvoiceAgainstAzure() throws Exception {

        // given
        String url = "https://formrecognizer.appliedai.azure.com/documents/samples/prebuilt/receipt.png";

        // when
        InvoiceData invoiceData = aiService.scanInvoice(new URI(url).toURL());

        //then
        assertNotNull(invoiceData);
    }
}