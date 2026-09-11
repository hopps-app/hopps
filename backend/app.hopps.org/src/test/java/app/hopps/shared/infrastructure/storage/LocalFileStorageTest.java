package app.hopps.shared.infrastructure.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Runs the {@link FileStorageContract} against the local backend, plus the checks that only make sense for a file
 * system: nothing may be written outside the storage root, and deleting must not leave debris behind.
 */
class LocalFileStorageTest extends FileStorageContract {

    private static final byte[] CONTENT = "Beleg-Inhalt".getBytes(StandardCharsets.UTF_8);

    @TempDir
    Path root;

    private LocalFileStorage storage;

    @BeforeEach
    void setUp() {
        storage = new LocalFileStorage(root);
        storage.initialize();
    }

    @Override
    protected FileStorage storage() {
        return storage;
    }

    @Test
    void shouldCreateTheRootDirectoryOnInitialize() throws IOException {
        Path missing = root.resolve("nested/storage");

        new LocalFileStorage(missing).initialize();

        assertTrue(Files.isDirectory(missing));
    }

    @Test
    void shouldStoreFilesUnderTheirKeyPath() {
        storage.put("documents/abc/beleg.pdf", CONTENT, "application/pdf");

        Path expected = root.resolve("documents/abc/beleg.pdf");
        assertTrue(Files.isRegularFile(expected));
    }

    @Test
    void shouldNotWriteOutsideTheStorageRoot() throws IOException {
        Path outside = root.getParent().resolve("escaped.pdf");
        Files.deleteIfExists(outside);

        assertThrows(StorageException.class, () -> storage.put("../escaped.pdf", CONTENT, "application/pdf"));

        assertFalse(Files.exists(outside));
    }

    @Test
    void shouldNotReadOutsideTheStorageRoot() throws IOException {
        Path secret = root.getParent().resolve("secret.txt");
        Files.write(secret, "streng geheim".getBytes(StandardCharsets.UTF_8));
        try {
            assertThrows(StorageException.class, () -> storage.get("../secret.txt"));
            assertThrows(StorageException.class, () -> storage.exists("../secret.txt"));
        } finally {
            Files.deleteIfExists(secret);
        }
    }

    @Test
    void shouldNotDeleteOutsideTheStorageRoot() throws IOException {
        Path victim = root.getParent().resolve("victim.txt");
        Files.write(victim, CONTENT);
        try {
            assertThrows(StorageException.class, () -> storage.delete("../victim.txt"));

            assertTrue(Files.exists(victim));
        } finally {
            Files.deleteIfExists(victim);
        }
    }

    @Test
    void shouldRemoveEmptyDirectoriesAfterDelete() {
        storage.put("documents/abc/beleg.pdf", CONTENT, "application/pdf");

        storage.delete("documents/abc/beleg.pdf");

        assertFalse(Files.exists(root.resolve("documents/abc")));
        assertFalse(Files.exists(root.resolve("documents")));
        assertTrue(Files.isDirectory(root), "the storage root itself must survive");
    }

    @Test
    void shouldKeepDirectoriesThatStillHoldFiles() {
        storage.put("documents/abc/one.pdf", CONTENT, "application/pdf");
        storage.put("documents/abc/two.pdf", CONTENT, "application/pdf");

        storage.delete("documents/abc/one.pdf");

        assertTrue(Files.isRegularFile(root.resolve("documents/abc/two.pdf")));
    }

    @Test
    void shouldNotLeaveTemporaryFilesBehind() throws IOException {
        storage.put("documents/abc/beleg.pdf", CONTENT, "application/pdf");

        try (var files = Files.list(root.resolve("documents/abc"))) {
            List<String> names = files.map(path -> path.getFileName().toString()).toList();
            assertEquals(List.of("beleg.pdf"), names);
        }
    }

    @Test
    void shouldReplaceTheFileAtomically() throws IOException {
        byte[] replacement = "Neuer Inhalt".getBytes(StandardCharsets.UTF_8);
        storage.put("documents/abc/beleg.pdf", CONTENT, "application/pdf");

        storage.put("documents/abc/beleg.pdf", replacement, "application/pdf");

        assertArrayEquals(replacement, Files.readAllBytes(root.resolve("documents/abc/beleg.pdf")));
    }

    @Test
    void shouldFailWhenTheRootIsNotWritable() throws IOException {
        Path file = Files.createFile(root.resolve("not-a-directory"));

        LocalFileStorage broken = new LocalFileStorage(file);

        assertThrows(StorageException.class, broken::initialize);
    }
}
