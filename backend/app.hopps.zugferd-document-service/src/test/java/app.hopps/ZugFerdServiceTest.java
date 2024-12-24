package app.hopps;

import app.hopps.model.InvoiceData;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
class ZugFerdServiceTest {

    @Inject
    ZugFerdService zugFerdService;

    @Test
    protected void shouldAnalyzeInvoiceWithZugferd() throws Exception {

        // given
        InputStream stream = getClass().getClassLoader().getResourceAsStream("MustangGnuaccountingBeispielRE-20170509_505.pdf");

        // when
        InvoiceData invoiceData = zugFerdService.scanInvoice(stream);

        // then
        assertNotNull(invoiceData);

        assertEquals(LocalDate.of(2017, 5, 30), invoiceData.dueDate());

        assertEquals(LocalDate.of(2017, 5, 9), invoiceData.invoiceDate());

        assertEquals("Theodor Est", invoiceData.customerName());

        assertEquals(571.04, invoiceData.total());

        assertEquals("RE-20170509/505", invoiceData.invoiceId());

        assertEquals("EUR", invoiceData.currencyCode());
    }
}