package app.hopps;

import app.hopps.model.InvoiceData;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
class ZugFerdServiceTest {

    @Inject
    ZugFerdService zugFerdService;

    @Test
    @Tag("zugferd")
    void shouldAnalyzeInvoiceWithZugferd() throws Exception {

        // given
        String path = "zugferd_invoice.pdf";

        // when
        InvoiceData invoiceData = zugFerdService.scanInvoice(path);

        // then
        assertNotNull(invoiceData);
    }
}