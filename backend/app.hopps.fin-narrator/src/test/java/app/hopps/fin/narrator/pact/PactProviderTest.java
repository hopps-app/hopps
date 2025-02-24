package app.hopps.fin.narrator.pact;

import app.hopps.fin.narrator.TaggingResource;
import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.loader.PactFolder;
import com.fasterxml.jackson.core.JsonProcessingException;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.json.JsonObject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@QuarkusTest
@Provider("fin-narrator")
@PactFolder("../../pacts")
public class PactProviderTest {

    @ConfigProperty(name = "quarkus.http.test-port")
    int quarkusPort;

    @InjectMock
    TaggingResource taggingResourceMock;

    @BeforeEach
    void before(PactVerificationContext context) throws JsonProcessingException {
        when(taggingResourceMock.tagInvoice(any(JsonObject.class)))
                .thenReturn(List.of("food", "pizza"));

        when(taggingResourceMock.tagReceipt(any(JsonObject.class)))
                .thenReturn(List.of("aws", "cloud"));

        context.setTarget(new HttpTestTarget("localhost", quarkusPort));
    }

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void pactVerificationTestTemplate(PactVerificationContext context) {
        context.verifyInteraction();
    }
}
