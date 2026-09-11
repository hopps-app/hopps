package app.hopps.shared.infrastructure.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.stream.Stream;

/**
 * Stores files on the local file system below a configured root directory, with the storage key used as the relative
 * path. Intended for single-node installations that do not want to run an object store; the root directory must be a
 * persistent (and backed up) volume.
 * <p>
 * Note that this backend does not persist content types — {@link StoredFile#contentType()} is guessed from the file
 * extension. All callers keep the real content type in the database next to the key.
 */
public class LocalFileStorage implements FileStorage {

    private static final Logger LOG = LoggerFactory.getLogger(LocalFileStorage.class);

    private static final String TEMP_FILE_PREFIX = ".upload-";
    private static final String TEMP_FILE_SUFFIX = ".tmp";

    private final Path root;

    public LocalFileStorage(Path root) {
        this.root = root.toAbsolutePath().normalize();
    }

    @Override
    public void initialize() {
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new StorageException("Could not create local storage root: " + root, e);
        }
        if (!Files.isDirectory(root) || !Files.isWritable(root)) {
            throw new StorageException("Local storage root is not a writable directory: " + root);
        }
        LOG.info("Local file storage ready, root={}", root);
    }

    @Override
    public void put(String key, byte[] content, String contentType) {
        Path target = resolve(key);
        Path directory = target.getParent();
        try {
            Files.createDirectories(directory);
        } catch (IOException e) {
            throw new StorageException("Could not create directory for key=" + key, e);
        }

        // Write to a temporary file in the same directory and move it into place, so that a crash mid-write cannot
        // leave a half-written file behind under a key the database already points at.
        Path temporary;
        try {
            temporary = Files.createTempFile(directory, TEMP_FILE_PREFIX, TEMP_FILE_SUFFIX);
        } catch (IOException e) {
            throw new StorageException("Could not create temporary file for key=" + key, e);
        }
        try {
            Files.write(temporary, content);
            move(temporary, target);
        } catch (IOException e) {
            throw new StorageException("Could not store file: key=" + key, e);
        } finally {
            deleteQuietly(temporary);
        }
        LOG.debug("Stored file locally: key={}, size={}", key, content.length);
    }

    @Override
    public StoredFile get(String key) {
        Path file = resolve(key);
        try {
            if (!Files.isRegularFile(file)) {
                throw new StoredFileNotFoundException(key);
            }
            return new StoredFile(Files.newInputStream(file), Files.size(file), probeContentType(file));
        } catch (NoSuchFileException e) {
            throw new StoredFileNotFoundException(key, e);
        } catch (IOException e) {
            throw new StorageException("Could not read file: key=" + key, e);
        }
    }

    @Override
    public void delete(String key) {
        Path file = resolve(key);
        try {
            Files.deleteIfExists(file);
        } catch (IOException e) {
            throw new StorageException("Could not delete file: key=" + key, e);
        }
        pruneEmptyDirectories(file.getParent());
        LOG.debug("Deleted local file: key={}", key);
    }

    @Override
    public boolean exists(String key) {
        return Files.isRegularFile(resolve(key));
    }

    /**
     * Maps a storage key onto a path below {@link #root}. {@link StorageKeys#validateKey(String)} already rejects
     * absolute and relative segments; the containment check afterwards is the backstop that guarantees no key can ever
     * address a file outside the storage root.
     */
    private Path resolve(String key) {
        StorageKeys.validateKey(key);
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root) || resolved.equals(root)) {
            throw new StorageException("Storage key escapes the storage root: " + key);
        }
        return resolved;
    }

    private void move(Path source, Path target) throws IOException {
        try {
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException e) {
            // Some volume types (certain network mounts) cannot move atomically; the replace is still better than
            // writing into the target directly.
            LOG.debug("Atomic move not supported at {}, falling back to a plain move", target.getParent());
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    /**
     * Removes the now-empty {@code {uuid}/} directory a deleted file leaves behind, and any empty parent above it, so
     * the storage root does not accumulate empty directories. Stops at the root and on the first non-empty directory.
     */
    private void pruneEmptyDirectories(Path directory) {
        Path current = directory;
        while (current != null && !current.equals(root) && current.startsWith(root)) {
            try (Stream<Path> entries = Files.list(current)) {
                if (entries.findAny().isPresent()) {
                    return;
                }
                Files.delete(current);
            } catch (IOException e) {
                // Concurrent uploads may recreate or lock the directory; leaving it behind is harmless.
                LOG.debug("Could not prune directory {}", current, e);
                return;
            }
            current = current.getParent();
        }
    }

    private String probeContentType(Path file) {
        try {
            return Files.probeContentType(file);
        } catch (IOException | UncheckedIOException e) {
            return null;
        }
    }

    private void deleteQuietly(Path file) {
        try {
            Files.deleteIfExists(file);
        } catch (IOException e) {
            LOG.debug("Could not delete temporary file {}", file, e);
        }
    }
}
