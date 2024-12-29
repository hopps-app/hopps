package app.hopps.zugferd.auth;

import io.quarkus.rest.client.reactive.QuarkusRestClientBuilder;

import java.io.IOException;
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

    public byte[] getDocumentBase64(String accessToken) {
        try (InputStream document = getDocument(accessToken)) {
            return document.readAllBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Document could not be fetched and converted", e);
        }
    }

    public InputStream getDocument(String accessToken) {
        return restClient.getDocument("Bearer " + accessToken);
    }
}
