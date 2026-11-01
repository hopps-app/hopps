package app.hopps.uploadlink.service;

import jakarta.ws.rs.ClientErrorException;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class UploadRateLimiterTest {

    private static UploadRateLimiter limiter(int maxUploads) {
        UploadRateLimiter limiter = new UploadRateLimiter();
        limiter.maxUploads = maxUploads;
        limiter.window = Duration.ofMinutes(10);
        return limiter;
    }

    @Test
    void refusesUploadsBeyondTheLimit() {
        UploadRateLimiter limiter = limiter(2);
        limiter.acquire("link:1.2.3.4");
        limiter.acquire("link:1.2.3.4");

        ClientErrorException e = assertThrows(ClientErrorException.class, () -> limiter.acquire("link:1.2.3.4"));
        assertEquals(429, e.getResponse().getStatus());
    }

    @Test
    void countsEachKeySeparately() {
        UploadRateLimiter limiter = limiter(1);
        limiter.acquire("link:1.2.3.4");
        assertDoesNotThrow(() -> limiter.acquire("link:5.6.7.8"));
    }
}
