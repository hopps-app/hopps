package app.hopps.shared.infrastructure.storage;

/**
 * Signals that no file is stored under the requested key. This happens routinely when a database record outlives its
 * file (e.g. ephemeral local storage was reset), so callers usually translate it into a 404 rather than an error.
 */
public class StoredFileNotFoundException extends StorageException {

    private final String key;

    public StoredFileNotFoundException(String key) {
        super("No file stored under key: " + key);
        this.key = key;
    }

    public StoredFileNotFoundException(String key, Throwable cause) {
        super("No file stored under key: " + key, cause);
        this.key = key;
    }

    public String getKey() {
        return key;
    }
}
