package app.hopps.bankimport.service;

import jakarta.enterprise.context.ApplicationScoped;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.regex.Pattern;

/**
 * Computes a stable per-row hash to detect duplicate {@link app.hopps.bankimport.domain.BankTransaction}s on re-import.
 * Hybrid strategy (Q14): when an end-to-end reference is present, it is the strongest signal; otherwise we fall back to
 * a normalised purpose.
 * <p>
 * Normalisation is intentionally aggressive so that cross-format differences do not produce false non-matches:
 * <ul>
 * <li>Purpose: all non-alphanumeric characters are stripped so MT940 concatenation differences (missing spaces between
 * tokens), time-separator variants ({@code 09:33} vs {@code 09.33}), and trailing spaces never affect the hash.</li>
 * <li>Counterparty IBAN: values that do not start with a two-letter country code (e.g. legacy account numbers like
 * {@code "0000000000"} in Sparkasse ENTGELTABSCHLUSS rows) are normalised to empty so that MT940 (empty field) and CAMT
 * (placeholder account) hash identically.</li>
 * </ul>
 */
@ApplicationScoped
public class DedupeHashService {

    private static final Pattern NON_ALNUM = Pattern.compile("[^\\p{L}\\p{N}]");

    public String computeHash(
            LocalDate bookingDate,
            BigDecimal amount,
            String counterpartyIban,
            String endToEndReference,
            String purpose) {
        StringBuilder material = new StringBuilder(128);
        material.append(bookingDate != null ? bookingDate.toString() : "");
        material.append('|');
        material.append(amount != null ? amount.stripTrailingZeros().toPlainString() : "");
        material.append('|');
        material.append(normalizeIban(counterpartyIban));
        material.append('|');
        if (endToEndReference != null && !endToEndReference.isBlank()) {
            material.append("eref:").append(endToEndReference.trim());
        } else {
            material.append("svwz:").append(normalizePurpose(purpose));
        }
        return sha256(material.toString());
    }

    private static String normalizeIban(String iban) {
        if (iban == null)
            return "";
        String cleaned = iban.toUpperCase().replaceAll("\\s+", "");
        if (cleaned.isEmpty())
            return "";
        // Reject plain account numbers (e.g. "0000000000") — a real IBAN starts with 2-letter country code
        if (cleaned.length() < 4
                || !Character.isLetter(cleaned.charAt(0))
                || !Character.isLetter(cleaned.charAt(1))) {
            return "";
        }
        return cleaned;
    }

    private static String normalizePurpose(String purpose) {
        if (purpose == null) {
            return "";
        }
        String nfkc = Normalizer.normalize(purpose, Normalizer.Form.NFKC);
        return NON_ALNUM.matcher(nfkc).replaceAll("").toLowerCase();
    }

    public static String sha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public static String sha256(String value) {
        return sha256(value.getBytes(StandardCharsets.UTF_8));
    }
}
