package app.hopps.bankimport.parser;

import org.mozilla.universalchardet.UniversalDetector;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

/**
 * Detects the character encoding of a byte stream using Mozilla's juniversalchardet. German bank exports (Sparkasse,
 * VR-Bank, ...) are typically Windows-1252; if the file is decoded as UTF-8, German umlauts become U+FFFD replacement
 * characters and downstream parsing breaks. This class also exposes a helper to reject decoded text that contains
 * U+FFFD (see bank-import-feature.md §6 risk table).
 */
public final class EncodingDetector {

    /**
     * When the detector returns nothing usable, fall back to Windows-1252 (most common for German bank CSV exports).
     */
    public static final Charset FALLBACK_CHARSET = Charset.forName("windows-1252");

    private EncodingDetector() {
    }

    /**
     * Detects the charset of {@code bytes}. Returns {@link #FALLBACK_CHARSET} if detection is inconclusive.
     */
    public static Charset detect(byte[] bytes) {
        UniversalDetector detector = new UniversalDetector(null);
        detector.handleData(bytes, 0, bytes.length);
        detector.dataEnd();
        String name = detector.getDetectedCharset();
        detector.reset();
        if (name == null) {
            return FALLBACK_CHARSET;
        }
        try {
            return Charset.forName(name);
        } catch (Exception e) {
            return FALLBACK_CHARSET;
        }
    }

    /**
     * Decodes {@code bytes} using {@code charset} and throws {@link IllegalArgumentException} when the result contains
     * the Unicode replacement character (U+FFFD), which means the wrong encoding was used (e.g. Windows-1252 file
     * decoded as UTF-8 → unreadable).
     */
    public static String decodeStrict(byte[] bytes, Charset charset) {
        String decoded = new String(bytes, charset);
        if (decoded.indexOf('�') >= 0) {
            throw new IllegalArgumentException("Decoded text contains replacement characters — wrong encoding ("
                    + charset.displayName() + ")?");
        }
        return decoded;
    }

    /**
     * Convenience: detect and decode in one call. UTF-8 / UTF-16 with BOM are passed through; otherwise we fall back to
     * Windows-1252 if detection fails.
     */
    public static String detectAndDecode(byte[] bytes) {
        Charset charset = detect(bytes);
        try {
            return decodeStrict(bytes, charset);
        } catch (IllegalArgumentException e) {
            // Detector said one thing but the result is broken — try the most common bank fallbacks.
            if (charset != FALLBACK_CHARSET) {
                try {
                    return decodeStrict(bytes, FALLBACK_CHARSET);
                } catch (IllegalArgumentException ignored) {
                    // fall through
                }
            }
            if (charset != StandardCharsets.UTF_8) {
                try {
                    return decodeStrict(bytes, StandardCharsets.UTF_8);
                } catch (IllegalArgumentException ignored) {
                    // fall through
                }
            }
            throw e;
        }
    }
}
