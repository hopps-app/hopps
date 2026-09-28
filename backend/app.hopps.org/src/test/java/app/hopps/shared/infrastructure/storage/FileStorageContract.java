package app.hopps.shared.infrastructure.storage;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The behaviour every {@link FileStorage} implementation has to provide. Subclasses bind it to one backend so that S3
 * and local storage stay interchangeable — a caller must not be able to tell them apart.
 */
abstract class FileStorageContract {

    private static final byte[] CONTENT = "Beleg-Inhalt".getBytes(StandardCharsets.UTF_8);
    private static final String CONTENT_TYPE = "application/pdf";

    private final List<String> createdKeys = new ArrayList<>();

    protected abstract FileStorage storage();

    @AfterEach
    void cleanUp() {
        createdKeys.forEach(key -> {
            try {
                storage().delete(key);
            } catch (StorageException e) {
                // Best effort - a leftover object must not fail the test run.
            }
        });
        createdKeys.clear();
    }

    @Test
    void shouldRoundTripAStoredFile() throws Exception {
        String key = key("beleg.pdf");

        storage().put(key, CONTENT, CONTENT_TYPE);

        try (StoredFile file = storage().get(key)) {
            assertArrayEquals(CONTENT, file.content().readAllBytes());
            assertEquals(CONTENT.length, file.size());
        }
    }

    @Test
    void shouldReadWholeFileAsBytes() {
        String key = key("beleg.pdf");
        storage().put(key, CONTENT, CONTENT_TYPE);

        assertArrayEquals(CONTENT, storage().getBytes(key));
    }

    @Test
    void shouldOverwriteAnExistingKey() {
        String key = key("beleg.pdf");
        byte[] replacement = "Neuer Inhalt".getBytes(StandardCharsets.UTF_8);

        storage().put(key, CONTENT, CONTENT_TYPE);
        storage().put(key, replacement, CONTENT_TYPE);

        assertArrayEquals(replacement, storage().getBytes(key));
    }

    @Test
    void shouldReportWhetherAFileExists() {
        String key = key("beleg.pdf");
        assertFalse(storage().exists(key));

        storage().put(key, CONTENT, CONTENT_TYPE);

        assertTrue(storage().exists(key));
    }

    @Test
    void shouldDeleteAStoredFile() {
        String key = key("beleg.pdf");
        storage().put(key, CONTENT, CONTENT_TYPE);

        storage().delete(key);

        assertFalse(storage().exists(key));
        assertThrows(StoredFileNotFoundException.class, () -> storage().get(key));
    }

    @Test
    void shouldTreatDeletingAnUnknownKeyAsSuccess() {
        assertDoesNotThrow(() -> storage().delete(key("never-stored.pdf")));
    }

    @Test
    void shouldFailWithNotFoundForAnUnknownKey() {
        String key = key("never-stored.pdf");

        assertThrows(StoredFileNotFoundException.class, () -> storage().get(key));
        assertThrows(StoredFileNotFoundException.class, () -> storage().getBytes(key));
    }

    @ParameterizedTest
    @ValueSource(strings = { "../escaped.pdf", "documents/../../escaped.pdf", "/absolute.pdf", "a\\b.pdf", "" })
    void shouldRejectUnsafeKeys(String key) {
        assertThrows(StorageException.class, () -> storage().put(key, CONTENT, CONTENT_TYPE));
        assertThrows(StorageException.class, () -> storage().get(key));
        assertThrows(StorageException.class, () -> storage().delete(key));
    }

    /**
     * Namespaces every key by test run so that a shared backend (the S3 bucket) does not carry state between runs.
     */
    private String key(String name) {
        String key = "contract-test/" + UUID.randomUUID() + "/" + name;
        createdKeys.add(key);
        return key;
    }
}
