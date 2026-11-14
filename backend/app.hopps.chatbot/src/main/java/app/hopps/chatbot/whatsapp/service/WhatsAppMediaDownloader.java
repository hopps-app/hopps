package app.hopps.chatbot.whatsapp.service;

import app.hopps.chatbot.whatsapp.api.dto.MediaInfo;
import app.hopps.chatbot.whatsapp.client.WhatsAppGraphClient;
import app.hopps.chatbot.whatsapp.config.WhatsAppConfig;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Downloads a media object a user sent: first its metadata (which holds a short-lived URL), then the bytes from that
 * URL. Both calls need the access token.
 */
@ApplicationScoped
public class WhatsAppMediaDownloader {
    // Same limit as org's upload endpoint
    static final int MAX_BYTES = 10 * 1024 * 1024;

    private final WhatsAppGraphClient client;
    private final WhatsAppConfig config;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public WhatsAppMediaDownloader(@RestClient WhatsAppGraphClient client, WhatsAppConfig config) {
        this.client = client;
        this.config = config;
    }

    public byte[] download(String mediaId) throws IOException {
        String authorization = "Bearer " + config.accessToken();
        MediaInfo media = client.getMedia(config.graphApiVersion(), mediaId, authorization);
        HttpRequest request = HttpRequest.newBuilder(URI.create(media.url()))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", authorization)
                .GET()
                .build();
        try {
            HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200) {
                throw new IOException("Media download failed with HTTP " + response.statusCode());
            }
            if (response.body().length > MAX_BYTES) {
                throw new IOException("Media is larger than " + MAX_BYTES + " bytes");
            }
            return response.body();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Media download interrupted", e);
        }
    }
}
