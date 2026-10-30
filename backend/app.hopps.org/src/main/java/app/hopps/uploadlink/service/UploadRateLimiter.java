package app.hopps.uploadlink.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limits how many files can be submitted through one upload link from one client in a time window. In memory and per
 * instance: it is a brake against a leaked link being flooded, not an exact quota.
 */
@ApplicationScoped
public class UploadRateLimiter {

    @ConfigProperty(name = "hopps.upload-link.rate-limit.max-uploads", defaultValue = "30")
    int maxUploads;

    @ConfigProperty(name = "hopps.upload-link.rate-limit.window", defaultValue = "PT10M")
    Duration window;

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    private record Window(Instant start, int count) {
    }

    /**
     * Counts one upload for the key.
     *
     * @throws ClientErrorException
     *             (429) if the key has used up its uploads in the current window
     */
    public void acquire(String key) {
        Instant now = Instant.now();
        Window current = windows.compute(key, (k, w) -> w == null || !now.isBefore(w.start().plus(window))
                ? new Window(now, 1)
                : new Window(w.start(), w.count() + 1));
        if (current.count() > maxUploads) {
            throw new ClientErrorException("Too many uploads, please try again later",
                    Response.Status.TOO_MANY_REQUESTS);
        }
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(e -> !now.isBefore(e.getValue().start().plus(window)));
        }
    }
}
