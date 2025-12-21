package app.hopps.document.client;

import java.util.Map;

import io.quarkus.test.junit.QuarkusTestProfile;

public class WireMockTestProfile implements QuarkusTestProfile
{
	public static final int WIREMOCK_PORT = 18089;

	@Override
	public Map<String, String> getConfigOverrides()
	{
		return Map.of(
			"quarkus.wiremock.devservices.enabled", "true",
			"quarkus.wiremock.devservices.port", String.valueOf(WIREMOCK_PORT),
			"quarkus.rest-client.document-ai.url", "http://localhost:" + WIREMOCK_PORT);
	}
}
