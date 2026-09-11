package app.hopps.shared.infrastructure.storage;

import java.util.regex.Pattern;

/**
 * Builds and validates {@link FileStorage} keys.
 * <p>
 * Keys are built from user-supplied file names, which S3 tolerates but a file system does not: {@code ../} segments
 * would escape the storage root, and an over-long name would not fit the {@code varchar(255)} key columns. Both
 * backends therefore go through the same validation, so a key that works against one works against the other.
 */
public final class StorageKeys {

    /**
     * Everything outside this set is replaced with {@code _} — the same rule the bank import has always used.
     */
    private static final Pattern UNSAFE_FILE_NAME_CHARS = Pattern.compile("[^A-Za-z0-9._-]");

    private static final Pattern LEADING_DOTS = Pattern.compile("^\\.+");

    /**
     * Keys are persisted in {@code varchar(255)} columns and prefixed with up to ~60 characters of path, so the file
     * name part has to stay well below that.
     */
    private static final int MAX_FILE_NAME_LENGTH = 120;

    private static final int MAX_EXTENSION_LENGTH = 16;

    private static final int MAX_KEY_LENGTH = 255;

    private StorageKeys() {
    }

    /**
     * Turns a user-supplied file name into a single, safe path segment.
     *
     * @param fileName
     *            the original file name, may be {@code null} or contain path separators
     * @param fallback
     *            the name to use when nothing usable remains (e.g. {@code "import.csv"})
     *
     * @return a non-blank segment that contains no path separators and no {@code .}/{@code ..}
     */
    public static String sanitizeFileName(String fileName, String fallback) {
        String name = fileName == null ? "" : fileName.trim();

        // Drop any directory part a client may have sent along ("../../etc/passwd", "C:\tmp\x.pdf").
        name = name.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1);

        name = UNSAFE_FILE_NAME_CHARS.matcher(name).replaceAll("_");
        // Leading dots would turn the segment into "." or ".." (or a hidden file), so strip them.
        name = LEADING_DOTS.matcher(name).replaceAll("");

        if (name.isBlank()) {
            return fallback;
        }
        return truncate(name);
    }

    /**
     * Rejects keys that a file-system backend could not store safely.
     *
     * @param key
     *            the key to check
     *
     * @throws StorageException
     *             if the key is blank, too long, absolute, or contains {@code ..}, empty or control characters
     */
    public static void validateKey(String key) {
        if (key == null || key.isBlank()) {
            throw new StorageException("Storage key must not be blank");
        }
        if (key.length() > MAX_KEY_LENGTH) {
            throw new StorageException("Storage key is longer than " + MAX_KEY_LENGTH + " characters: " + key);
        }
        if (key.startsWith("/") || key.indexOf('\\') >= 0) {
            throw new StorageException("Storage key must be a relative, slash-separated path: " + key);
        }
        for (int i = 0; i < key.length(); i++) {
            char c = key.charAt(i);
            if (c < 0x20 || c == 0x7F) {
                throw new StorageException("Storage key must not contain control characters: " + key);
            }
        }
        // -1 keeps trailing empty segments, so "a/" and "a//b" are rejected as well.
        for (String segment : key.split("/", -1)) {
            if (segment.isEmpty() || ".".equals(segment) || "..".equals(segment)) {
                throw new StorageException("Storage key must not contain empty or relative segments: " + key);
            }
        }
    }

    private static String truncate(String name) {
        if (name.length() <= MAX_FILE_NAME_LENGTH) {
            return name;
        }
        int dot = name.lastIndexOf('.');
        String extension = dot > 0 && name.length() - dot <= MAX_EXTENSION_LENGTH ? name.substring(dot) : "";
        return name.substring(0, MAX_FILE_NAME_LENGTH - extension.length()) + extension;
    }
}
