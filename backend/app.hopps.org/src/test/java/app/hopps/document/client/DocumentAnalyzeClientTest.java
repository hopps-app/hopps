package app.hopps.document.client;

import app.hopps.document.client.DocumentAnalyzeClient;
import app.hopps.document.domain.InvoiceData;
import app.hopps.document.domain.ReceiptData;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.client.WireMock;
import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

@ConnectWireMock
@QuarkusTest
@QuarkusTestResource(DocumentAnalyzeWireMockResource.class)
public class DocumentAnalyzeClientTest {

    @Inject
    @RestClient
    DocumentAnalyzeClient documentAnalyzeClient;

    @Inject
    ObjectMapper objectMapper;

    WireMock wireMock;

    private static final String TEST_DOCUMENT = "{\"name\": \"test\"}";

    @Test
    void testCreateInvoiceEndpoint() throws JsonProcessingException {
        var responseBody = objectMapper.writeValueAsString(new InvoiceData(
                BigDecimal.valueOf(0.5f),
                LocalDate.ofYearDay(2024, 300),
                "EUR"));

        wireMock.register(
                post(urlEqualTo("/document/scan/invoice"))
                        .withHeader("Content-Type", containing(MediaType.MULTIPART_FORM_DATA))
                        .withMultipartRequestBody(
                                aMultipart("document")
                                        .withBody(equalTo(TEST_DOCUMENT)))
                        .withMultipartRequestBody(
                                aMultipart("transactionRecordId")
                                        .withBody(equalTo("32")))
                        .willReturn(
                                aResponse()
                                        .withStatus(200)
                                        .withBody(responseBody)
                                        .withHeader("Content-Type", "application/json")));

        var data = documentAnalyzeClient.scanInvoice(TEST_DOCUMENT.getBytes(), 32L);
        assertEquals(BigDecimal.valueOf(0.5), data.total());
        assertEquals(LocalDate.ofYearDay(2024, 300), data.invoiceDate());
    }

    @Test
    void testCreateReceiptEndpoint() throws JsonProcessingException {
        var responseBody = objectMapper.writeValueAsString(new ReceiptData(BigDecimal.valueOf(0.5f)));

        wireMock.register(
                post(urlEqualTo("/document/scan/receipt"))
                        .withHeader("Content-Type", containing(MediaType.MULTIPART_FORM_DATA))
                        .withMultipartRequestBody(
                                aMultipart("document")
                                        .withBody(equalTo(TEST_DOCUMENT)))
                        .withMultipartRequestBody(
                                aMultipart("transactionRecordId")
                                        .withBody(equalTo("32")))
                        .willReturn(
                                aResponse()
                                        .withStatus(200)
                                        .withBody(responseBody)
                                        .withHeader("Content-Type", "application/json")));

        var data = documentAnalyzeClient.scanReceipt(TEST_DOCUMENT.getBytes(), 32L);
        assertEquals(BigDecimal.valueOf(0.5), data.total());
    }

}
