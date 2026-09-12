package app.hopps.shared.infrastructure.storage;

import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;

/**
 * An open handle on a stored file. Closing it releases the underlying stream (and, for S3, the HTTP connection), so
 * callers must either close it or hand it to something that does — JAX-RS closes a streamed entity itself.
 *
 * @param content
 *            the file content, never {@code null}
 * @param size
 *            the content length in bytes, or {@code -1} if the backend does not report it
 * @param contentType
 *            the stored MIME type, or {@code null} if the backend does not keep one. Callers that need a reliable
 *            content type should use the one persisted alongside the key (e.g. {@code Document.fileContentType}); the
 *            local backend can only guess it from the file extension.
 */
public record StoredFile(InputStream content, long size, String contentType) implements Closeable {

    @Override
    public void close() throws IOException {
        content.close();
    }
}
