package app.hopps.shared.infrastructure.storage;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Runs the {@link FileStorageContract} against a real S3 server (LocalStack, started by Dev Services). This is the only
 * test that needs the object store; everything else in the suite runs on local storage.
 */
@QuarkusTest
@TestProfile(S3StorageTestProfile.class)
class S3FileStorageTest extends FileStorageContract {

    @Inject
    FileStorage fileStorage;

    @Inject
    StorageConfig storageConfig;

    @Override
    protected FileStorage storage() {
        return fileStorage;
    }

    /**
     * Guards against this test silently passing against local storage, which would make everything below meaningless.
     */
    @Test
    void shouldUseTheS3BackendInThisProfile() {
        assertEquals(StorageConfig.Backend.S3, storageConfig.type());
    }

    @Test
    void shouldReportTheStoredContentType() throws Exception {
        String key = "contract-test/" + UUID.randomUUID() + "/beleg.pdf";
        fileStorage.put(key, "Beleg".getBytes(StandardCharsets.UTF_8), "application/pdf");

        try (StoredFile file = fileStorage.get(key)) {
            assertEquals("application/pdf", file.contentType());
        } finally {
            fileStorage.delete(key);
        }
    }
}
