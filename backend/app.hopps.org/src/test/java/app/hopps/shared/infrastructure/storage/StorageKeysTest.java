package app.hopps.shared.infrastructure.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StorageKeysTest {

    @Test
    void shouldKeepHarmlessFileNames() {
        assertEquals("Rechnung-2026_01.pdf", StorageKeys.sanitizeFileName("Rechnung-2026_01.pdf", "fallback"));
    }

    @Test
    void shouldReplaceUnsafeCharacters() {
        assertEquals("Beleg_Mai_2026_.pdf", StorageKeys.sanitizeFileName("Beleg Mai 2026 .pdf", "fallback"));
        assertEquals("quittung__.jpg", StorageKeys.sanitizeFileName("quittung ü.jpg", "fallback"));
    }

    @Test
    void shouldDropDirectoryParts() {
        assertEquals("passwd", StorageKeys.sanitizeFileName("../../../etc/passwd", "fallback"));
        assertEquals("x.pdf", StorageKeys.sanitizeFileName("C:\\Users\\bob\\x.pdf", "fallback"));
    }

    @ParameterizedTest
    @ValueSource(strings = { "..", ".", "...", "/", "   ", "" })
    void shouldFallBackWhenNothingUsableRemains(String fileName) {
        assertEquals("fallback", StorageKeys.sanitizeFileName(fileName, "fallback"));
    }

    @Test
    void shouldFallBackForNullFileName() {
        assertEquals("fallback", StorageKeys.sanitizeFileName(null, "fallback"));
    }

    @Test
    void shouldTruncateLongFileNamesButKeepTheExtension() {
        String name = "a".repeat(400) + ".pdf";

        String sanitized = StorageKeys.sanitizeFileName(name, "fallback");

        // Keys live in varchar(255) columns, so the file name part has to stay well below that.
        assertTrue(sanitized.length() <= 120, "was " + sanitized.length());
        assertTrue(sanitized.endsWith(".pdf"), sanitized);
    }

    @Test
    void shouldAcceptRegularKeys() {
        assertDoesNotThrow(() -> StorageKeys.validateKey("documents/019676cf-46cf-71be-803d-1011e05e0840/beleg.pdf"));
        assertDoesNotThrow(() -> StorageKeys.validateKey("logo"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "../etc/passwd",
            "documents/../../etc/passwd",
            "documents/./beleg.pdf",
            "/absolute/key",
            "documents//beleg.pdf",
            "documents/",
            "documents\\beleg.pdf",
            "documents/beleg\u0000.pdf",
            "   " })
    void shouldRejectUnsafeKeys(String key) {
        assertThrows(StorageException.class, () -> StorageKeys.validateKey(key));
    }

    @Test
    void shouldRejectNullKey() {
        assertThrows(StorageException.class, () -> StorageKeys.validateKey(null));
    }

    @Test
    void shouldRejectKeysThatDoNotFitTheDatabaseColumn() {
        assertThrows(StorageException.class, () -> StorageKeys.validateKey("documents/" + "a".repeat(300)));
    }
}
