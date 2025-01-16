package app.hopps.fin;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

@QuarkusTest
class S3HandlerTest {
    @Inject
    S3Handler s3Handler;

    @Test
    void shouldBeUpAndRunning() {
        assertDoesNotThrow(() -> s3Handler.setup(null));
    }
}
