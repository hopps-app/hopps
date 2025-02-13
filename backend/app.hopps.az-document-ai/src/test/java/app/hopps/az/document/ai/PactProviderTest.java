package app.hopps.az.document.ai;

import app.hopps.commons.InvoiceData;
import app.hopps.commons.ReceiptData;
import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.loader.PactFolder;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@Provider("az-document-ai")
@PactFolder("../../pacts")
@QuarkusTest
public class PactProviderTest {

    @ConfigProperty(name = "quarkus.http.test-port")
    int quarkusPort;

    @InjectMock
    AzureAiService azureAiService;

    @BeforeEach
    void before(PactVerificationContext context) {
        context.setTarget(new HttpTestTarget("localhost", quarkusPort, "/api/az-document-ai"));

        var invoice = new InvoiceData(
                -1L,
                BigDecimal.valueOf(0.5f),
                LocalDate.ofYearDay(2024, 300),
                "EUR");

        var receipt = new ReceiptData(
                -1L,
                BigDecimal.valueOf(0.5f));

        when(azureAiService.scanInvoice(any(Path.class), anyString()))
                .thenReturn(Optional.of(invoice));
        when(azureAiService.scanReceipt(any(Path.class), anyString()))
                .thenReturn(Optional.of(receipt));
    }

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void pactVerificationTestTemplate(PactVerificationContext context) {
        context.verifyInteraction();
    }
}
