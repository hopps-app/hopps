package app.hopps;

import app.hopps.commons.DocumentData;
import app.hopps.commons.DocumentType;
import app.hopps.commons.InvoiceData;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
class AzureAiServiceTest {

    @Inject
    AzureAiService aiService;

    @Test
    @Tag("azure")
    void shouldAnalyzeInvoiceAgainstAzure() throws Exception {

        // given
        String url = "https://formrecognizer.appliedai.azure.com/documents/samples/prebuilt/receipt.png";
        DocumentData documentData = new DocumentData(new URI(url).toURL(), -1L, DocumentType.INVOICE);

        // when
        InvoiceData invoiceData = aiService.scanInvoice(documentData);

        // then
        assertNotNull(invoiceData);
    }
}
