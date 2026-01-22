package app.fuggs.document.client;

import java.util.HashMap;
import java.util.Map;

import io.quarkus.test.junit.QuarkusTestProfile;

public class WireMockTestProfile implements QuarkusTestProfile
{
	public static final int WIREMOCK_PORT = 18089;

	@Override
	public Map<String, String> getConfigOverrides()
	{
		Map<String, String> config = new HashMap<>();
		config.put("quarkus.wiremock.devservices.enabled", "true");
		config.put("quarkus.wiremock.devservices.port", String.valueOf(WIREMOCK_PORT));
		config.put("quarkus.rest-client.document-ai.url", "http://localhost:" + WIREMOCK_PORT);
		config.put("quarkus.rest-client.zugferd.url", "http://localhost:" + WIREMOCK_PORT);
		// Ensure S3 devservices are enabled for integration tests
		config.put("quarkus.s3.devservices.enabled", "true");
		return config;
	}
}
