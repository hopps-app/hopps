package app.hopps.zugferd.auth;

import io.quarkus.rest.client.reactive.QuarkusRestClientBuilder;

import java.io.InputStream;
import java.net.URISyntaxException;
import java.net.URL;

public class FinRestClientImpl {
    private final FinRestClient restClient;

    public FinRestClientImpl(URL path) throws URISyntaxException {
        restClient = QuarkusRestClientBuilder.newBuilder()
                .baseUri(path.toURI())
                .build(FinRestClient.class);
    }

    /**
     * @param accessToken
     *            without "Bearer "
     *
     * @return document
     */
    public InputStream getDocument(String accessToken) {
        return restClient.getDocument("Bearer " + accessToken);
    }
}
