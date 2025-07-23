package app.hopps.fin.pact;

import io.quarkus.test.junit.QuarkusTestProfile;

import java.util.Map;

public class PactTestProfile implements QuarkusTestProfile {
    @Override
    public Map<String, String> getConfigOverrides() {
        return Map.of(
                "quarkus.rest-client.fin-narrator.uri", "http://localhost:${app.hopps.fin-narrator.pact.port}",
                "app.hopps.fin-narrator.pact.port", "57853",
                "quarkus.rest-client.document-analysis.url", "http://localhost:${app.hopps.fin.pact.port}/",
                "app.hopps.fin.pact.port", "57852");
    }
}
