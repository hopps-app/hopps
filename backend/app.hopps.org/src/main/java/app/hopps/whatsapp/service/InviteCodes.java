package app.hopps.whatsapp.service;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.Optional;

/**
 * WhatsApp invite codes: 10 characters of Crockford base32 (about 50 bit), shown as {@code ABCDE-FGHJK}. The alphabet
 * has no I, L, O or U, so a code typed by hand survives common mix-ups; those letters are read as 1, 1, 0 and V.
 */
public final class InviteCodes {
    static final String ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    static final int LENGTH = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    private InviteCodes() {
    }

    /** A new random code in normalized form, e.g. {@code ABCDEFGHJK}. */
    public static String generate() {
        StringBuilder code = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            code.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return code.toString();
    }

    /** {@code ABCDEFGHJK} → {@code ABCDE-FGHJK}. */
    public static String format(String code) {
        return code.substring(0, 5) + "-" + code.substring(5);
    }

    /**
     * Normalizes user input: uppercase, separators removed, look-alike letters mapped.
     *
     * @return the normalized code, or empty if the input cannot be a code
     */
    public static Optional<String> normalize(String input) {
        if (input == null) {
            return Optional.empty();
        }
        String code = input.toUpperCase(Locale.ROOT)
                .replaceAll("[\\s-]", "")
                .replace('O', '0')
                .replace('I', '1')
                .replace('L', '1')
                .replace('U', 'V');
        if (code.length() != LENGTH || !code.chars().allMatch(c -> ALPHABET.indexOf(c) >= 0)) {
            return Optional.empty();
        }
        return Optional.of(code);
    }

}
