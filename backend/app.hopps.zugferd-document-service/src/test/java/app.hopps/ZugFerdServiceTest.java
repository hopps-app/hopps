package app.hopps;

import app.hopps.model.InvoiceData;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
class ZugFerdServiceTest {

    @Inject
    ZugFerdService zugFerdService;

    @Test
    @Tag("zugferd")
    void shouldAnalyzeInvoiceWithZugferd() throws Exception {

        // given
        String path = "src/test/resources/MustangGnuaccountingBeispielRE-20170509_505.pdf";

        // when
        InvoiceData invoiceData = zugFerdService.scanInvoice(path);

        // then
        assertNotNull(invoiceData);

        assertEquals(invoiceData.invoiceDate(), LocalDate.of(2017, 5, 9));

        assertEquals(invoiceData.customerName(), "Theodor Est");
    }
}