package app.hopps.shared.infrastructure.storage;

import java.io.IOException;

/**
 * Backend-agnostic access to stored binary files (receipts, organization logos, bank import files).
 * <p>
 * Implementations are selected at runtime via {@code hopps.storage.type}; see {@link S3FileStorage} and
 * {@link LocalFileStorage}. No implementation detail (AWS SDK types, file system paths) may leak through this
 * interface, so that callers work the same way regardless of the configured backend.
 * <p>
 * Keys are slash-separated paths such as {@code documents/{uuid}/{fileName}} and must satisfy
 * {@link StorageKeys#validateKey(String)}.
 */
public interface FileStorage {

    /**
     * Stores the given content under {@code key}, replacing any existing object with the same key.
     *
     * @param key
     *            the storage key
     * @param content
     *            the file content
     * @param contentType
     *            the MIME type, may be {@code null}
     *
     * @throws StorageException
     *             if the content could not be stored
     */
    void put(String key, byte[] content, String contentType);

    /**
     * Opens the stored file for reading. The caller owns the returned {@link StoredFile} and must close it.
     *
     * @param key
     *            the storage key
     *
     * @return the open file
     *
     * @throws StoredFileNotFoundException
     *             if no file is stored under that key
     * @throws StorageException
     *             if the file could not be read
     */
    StoredFile get(String key);

    /**
     * Reads the stored file completely into memory. Convenience for callers that need the whole content anyway.
     *
     * @param key
     *            the storage key
     *
     * @return the file content
     *
     * @throws StoredFileNotFoundException
     *             if no file is stored under that key
     */
    default byte[] getBytes(String key) {
        try (StoredFile file = get(key)) {
            return file.content().readAllBytes();
        } catch (IOException e) {
            throw new StorageException("Could not read file: key=" + key, e);
        }
    }

    /**
     * Deletes the stored file. Deleting a key that does not exist is not an error.
     *
     * @param key
     *            the storage key
     */
    void delete(String key);

    /**
     * @param key
     *            the storage key
     *
     * @return whether a file is stored under that key
     */
    boolean exists(String key);

    /**
     * Prepares the backend for use (creating the bucket or the root directory). Called once at application startup so
     * that a misconfigured storage fails fast instead of on the first upload.
     *
     * @throws StorageException
     *             if the backend is not usable
     */
    void initialize();
}
