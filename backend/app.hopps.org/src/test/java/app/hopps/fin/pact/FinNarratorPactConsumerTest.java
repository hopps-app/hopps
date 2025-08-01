package app.hopps.fin.pact;

import app.hopps.fin.client.FinNarratorClient;
import app.hopps.fin.model.InvoiceData;
import app.hopps.fin.model.ReceiptData;
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
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
@PactDirectory("../../pacts")
@PactTestFor(providerName = "fin-narrator", pactVersion = PactSpecVersion.V4)
@MockServerConfig(port = "${app.hopps.fin-narrator.pact.port}")
@TestProfile(PactTestProfile.class)
@ExtendWith(PactConsumerTestExt.class)
public class FinNarratorPactConsumerTest {

    public static final InvoiceData EXAMPLE_INVOICE = new InvoiceData(
            BigDecimal.valueOf(3.0),
            LocalDate.ofYearDay(2024, 20),
            "EUR");

    public static final ReceiptData EXAMPLE_RECEIPT = new ReceiptData(BigDecimal.valueOf(3.0));

    @Inject
    @RestClient
    FinNarratorClient finNarratorClient;

    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Pact(consumer = "fin")
    public V4Pact createTagInvoicePact(PactDslWithProvider builder) throws JsonProcessingException {
        var exampleRequestBody = objectMapper.writeValueAsString(EXAMPLE_INVOICE);

        return builder
                .uponReceiving("tag invoice request")
                .method("POST")
                .path("/api/fin-narrator/tag/invoice")
                .bodyMatchingContentType("application/json", exampleRequestBody)
                .willRespondWith()
                .status(200)
                .bodyMatchingContentType("application/json", "[\"food\", \"pizza\"]")
                .toPact(V4Pact.class);
    }

    @Pact(consumer = "fin")
    public V4Pact createTagReceiptPact(PactDslWithProvider builder) throws JsonProcessingException {
        var exampleRequestBody = objectMapper.writeValueAsString(EXAMPLE_RECEIPT);

        return builder
                .uponReceiving("tag receipt request")
                .method("POST")
                .path("/api/fin-narrator/tag/receipt")
                .bodyMatchingContentType("application/json", exampleRequestBody)
                .willRespondWith()
                .status(200)
                .bodyMatchingContentType("application/json", "[\"aws\", \"cloud\"]")
                .toPact(V4Pact.class);
    }

    @Test
    @PactTestFor(pactMethod = "createTagInvoicePact")
    void testInvoiceTagging() {
        var tags = finNarratorClient.tagInvoice(EXAMPLE_INVOICE);

        assertEquals(List.of("food", "pizza"), tags);
    }

    @Test
    @PactTestFor(pactMethod = "createTagReceiptPact")
    void testReceiptTagging() {
        var tags = finNarratorClient.tagReceipt(EXAMPLE_RECEIPT);

        assertEquals(List.of("aws", "cloud"), tags);
    }

}
