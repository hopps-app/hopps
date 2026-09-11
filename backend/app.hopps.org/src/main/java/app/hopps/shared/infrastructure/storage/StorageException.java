package app.hopps.shared.infrastructure.storage;

/**
 * Signals that a {@link FileStorage} operation failed. Wraps backend-specific exceptions so that callers do not need to
 * know whether files live in S3 or on a local disk.
 */
public class StorageException extends RuntimeException {

    public StorageException(String message) {
        super(message);
    }

    public StorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
