package app.hopps.bankimport.parser;

import org.junit.jupiter.api.Test;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EncodingDetectorTest {

    private static final Charset WIN1252 = Charset.forName("windows-1252");

    // German umlauts encoded in Windows-1252
    private static final byte[] WIN1252_BYTES = "Kontonummer;Buchungsdatum;Betrag\r\nÄrger;01.01.2024;100,00\r\n"
            .getBytes(WIN1252);

    private static final byte[] UTF8_BYTES = "Buchungsdatum;Betrag\r\n01.01.2024;100,00\r\n"
            .getBytes(StandardCharsets.UTF_8);

    @Test
    void decodeStrictPassesForCorrectEncoding() {
        String decoded = EncodingDetector.decodeStrict(WIN1252_BYTES, WIN1252);
        assertTrue(decoded.contains("Ärger"));
    }

    @Test
    void decodeStrictRejectsReplacementCharacters() {
        // Windows-1252 bytes decoded as UTF-8 → replacement characters for umlauts
        assertThrows(IllegalArgumentException.class,
                () -> EncodingDetector.decodeStrict(WIN1252_BYTES, StandardCharsets.UTF_8));
    }

    @Test
    void decodeStrictPassesForUtf8() {
        String decoded = EncodingDetector.decodeStrict(UTF8_BYTES, StandardCharsets.UTF_8);
        assertTrue(decoded.contains("Buchungsdatum"));
    }

    @Test
    void detectAndDecodeUtf8() {
        byte[] utf8WithBom = "﻿Buchungsdatum;Betrag\r\n01.01.2024;100\r\n"
                .getBytes(StandardCharsets.UTF_8);
        // UTF-8 with BOM is reliably detected
        String decoded = EncodingDetector.detectAndDecode(utf8WithBom);
        // May contain BOM char at start; important thing is no exception and content is readable
        assertTrue(decoded.contains("Buchungsdatum"));
    }

    @Test
    void detectReturnsCharsetOrFallback() {
        // Should never return null
        Charset charset = EncodingDetector.detect(WIN1252_BYTES);
        // Result is either correctly detected (windows-1252 / ISO-8859-1 family) or the fallback
        assertTrue(charset != null);
    }

    @Test
    void detectAndDecodeAsciiOnlyData() {
        byte[] ascii = "Date;Amount\n01.01.2024;100.00\n".getBytes(StandardCharsets.US_ASCII);
        String decoded = EncodingDetector.detectAndDecode(ascii);
        assertTrue(decoded.contains("Date"));
    }

    @Test
    void fallbackCharsetIsWindows1252() {
        assertEquals("windows-1252", EncodingDetector.FALLBACK_CHARSET.name().toLowerCase());
    }
}
