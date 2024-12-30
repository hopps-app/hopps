package app.hopps.auth;

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

    /**
     * @param accessToken
     *            without "Bearer "
     *
     * @return document in byte array
     */
    public byte[] getDocumentBase64(String accessToken) {
        try (InputStream document = getDocument(accessToken)) {
            return document.readAllBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Document could not be fetched and converted", e);
        }
    }

    private InputStream getDocument(String accessToken) {
        return restClient.getDocument("Bearer " + accessToken);
    }
}
