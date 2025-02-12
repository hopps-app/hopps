package app.hopps;

import app.hopps.commons.InvoiceData;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class AzureAiServiceTest {

    @Inject
    AzureAiService aiService;

    @Test
    @Tag("azure")
    void shouldAnalyzeInvoiceAgainstAzure() throws URISyntaxException {
        // given
        URL imageResource = getClass().getClassLoader().getResource("receipt.png");
        Path imagePath = Paths.get(imageResource.toURI());

        // when
        Optional<InvoiceData> invoiceData = aiService.scanInvoice(imagePath, "receipt.png");

        // then
        assertNotNull(invoiceData);
        assertTrue(invoiceData.isPresent());
    }
}
