package app.hopps.fin.delegates;

import app.hopps.fin.model.DocumentType;
import app.hopps.fin.model.InvoiceData;
import com.github.tomakehurst.wiremock.client.WireMock;
import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
@ConnectWireMock
class TagDocumentDelegateTest {

    WireMock wireMock;

    @Inject
    TagDocumentDelegate delegate;

    @Test
    void documentTagInterfaceIsCorrect() {
        // given
        wireMock.register(
                post(urlPathMatching("/api/fin-narrator/tag/invoice"))
                        .withRequestBody(containing("currencyCode"))
                        .willReturn(aResponse()
                                .withStatus(200)
                                .withBody("[\"food\", \"pizza\"]")
                                .withHeader("Content-Type", "application/json")));

        InvoiceData data = new InvoiceData(
                -1L,
                BigDecimal.valueOf(3.0),
                LocalDate.ofYearDay(2024, 20),
                "EUR");

        // when
        var tags = delegate.tagDocument(DocumentType.INVOICE, data);

        // then
        assertEquals(2, tags.size());
        assertTrue(tags.contains("food"));
        assertTrue(tags.contains("pizza"));
    }

}
