package app.hopps.fin.pact;

import app.hopps.commons.InvoiceData;
import app.hopps.commons.ReceiptData;
import app.hopps.fin.client.DocumentAnalyzeClient;
import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.consumer.junit.MockServerConfig;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.core.model.PactSpecVersion;
import au.com.dius.pact.core.model.V4Pact;
import au.com.dius.pact.core.model.annotations.Pact;
import au.com.dius.pact.core.model.annotations.PactDirectory;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import jakarta.ws.rs.HttpMethod;
import jakarta.ws.rs.core.MediaType;
import org.apache.hc.client5.http.entity.mime.MultipartEntityBuilder;
import org.apache.hc.core5.http.ContentType;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
@PactDirectory("../../pacts")
@PactTestFor(providerName = "az-document-ai", pactVersion = PactSpecVersion.V4)
@MockServerConfig(port = "${app.hopps.fin.pact.port}")
@TestProfile(PactTestProfile.class)
@ExtendWith(PactConsumerTestExt.class)
public class ScanDocumentPactConsumerTest {

    @Inject
    @RestClient
    DocumentAnalyzeClient documentAnalyzeClient;

    ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    @Pact(consumer = "fin")
    public V4Pact createInvoiceScanPact(PactDslWithProvider builder) throws IOException {
        var responseBody = mapper.writeValueAsString(new InvoiceData(
                -1L,
                BigDecimal.valueOf(0.5f),
                LocalDate.ofYearDay(2024, 300),
                "EUR"));

        return builder.uponReceiving("Invoice scan")
                .path("/document/scan/invoice")
                .headers("Content-Type", MediaType.MULTIPART_FORM_DATA)
                .method(HttpMethod.POST)
                .body(createRequestBody())
                .willRespondWith()
                .successStatus()
                .body(responseBody, MediaType.APPLICATION_JSON)
                .toPact(V4Pact.class);
    }

    @Pact(consumer = "fin")
    public V4Pact createReceiptScanPact(PactDslWithProvider builder) throws JsonProcessingException {
        var responseBody = mapper.writeValueAsString(new ReceiptData(
                -1L,
                BigDecimal.valueOf(0.5f)));

        return builder.uponReceiving("Receipt scan")
                .path("/document/scan/receipt")
                .headers("Content-Type", MediaType.MULTIPART_FORM_DATA)
                .method(HttpMethod.POST)
                .body(createRequestBody())
                .willRespondWith()
                .successStatus()
                .body(responseBody, MediaType.APPLICATION_JSON)
                .toPact(V4Pact.class);
    }

    private MultipartEntityBuilder createRequestBody() {
        byte[] document = getTestDocument();
        return MultipartEntityBuilder.create()
                .addBinaryBody("document", document, ContentType.APPLICATION_OCTET_STREAM, "document")
                .addTextBody("transactionRecordId", "32", ContentType.create("text/plain", StandardCharsets.UTF_8));
    }

    private byte[] getTestDocument() {
        return "{\"name\": \"test\"}".getBytes(StandardCharsets.UTF_8);
    }

    @Test
    @PactTestFor(pactMethod = "createInvoiceScanPact")
    public void testInvoiceScanning() {
        var data = documentAnalyzeClient.scanInvoice(getTestDocument(), 32L);
        assertEquals(BigDecimal.valueOf(0.5), data.total());
        assertEquals(LocalDate.ofYearDay(2024, 300), data.invoiceDate());
    }

    @Test
    @PactTestFor(pactMethod = "createReceiptScanPact")
    public void testReceiptScanning() {
        var data = documentAnalyzeClient.scanReceipt(getTestDocument(), 32L);
        assertEquals(BigDecimal.valueOf(0.5), data.total());
    }
}
