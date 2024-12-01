package app.hopps.fin.pact;

import app.hopps.fin.client.Bommel;
import app.hopps.fin.client.OrgRestClient;
import au.com.dius.pact.consumer.dsl.PactDslJsonBody;
import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.consumer.junit.MockServerConfig;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.core.model.PactSpecVersion;
import au.com.dius.pact.core.model.V4Pact;
import au.com.dius.pact.core.model.annotations.Pact;
import au.com.dius.pact.core.model.annotations.PactDirectory;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
@PactDirectory("../../pacts")
@PactTestFor(providerName = "org", pactVersion = PactSpecVersion.V4)
@MockServerConfig(port = "${app.hopps.fin.pact.port}")
@TestProfile(PactTestProfile.class)
@ExtendWith(PactConsumerTestExt.class)
class PactConsumerTest {

    @RestClient
    OrgRestClient orgRestClient;

    @Pact(consumer = "fin")
    public V4Pact createPact(PactDslWithProvider builder) {
        Map<String, String> headers = Map.of("Content-Type", MediaType.APPLICATION_JSON);

        PactDslJsonBody pactDslJsonBody = new PactDslJsonBody()
                .stringValue("name", "BommelName")
                .stringValue("emoji", "BommelEmoji");

        return builder
                .uponReceiving("get bommel request")
                .path("/bommel/1")
                .method("GET")
                .willRespondWith()
                .status(Response.Status.OK.getStatusCode())
                .headers(headers)
                .body(pactDslJsonBody)
                .toPact(V4Pact.class);
    }

    @Test
    @PactTestFor(pactMethod = "createPact")
    void testConsumer() {
        Bommel bommel = orgRestClient.getBommel(1L);

        assertNotNull(bommel);
        assertEquals("BommelName", bommel.name());
    }
}
