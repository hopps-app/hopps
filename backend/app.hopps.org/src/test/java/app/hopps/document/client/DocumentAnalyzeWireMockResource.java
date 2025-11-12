package app.hopps.document.client;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;

import java.util.Map;

public class DocumentAnalyzeWireMockResource implements QuarkusTestResourceLifecycleManager {

    @Override
    public Map<String, String> start() {
        return Map.of(
                "quarkus.rest-client.document-analysis.url", "http://localhost:${quarkus.wiremock.devservices.port}");
    }

    @Override
    public void stop() {

    }

}
