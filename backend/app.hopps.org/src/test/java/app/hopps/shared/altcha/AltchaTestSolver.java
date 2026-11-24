package app.hopps.shared.altcha;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.UncheckedIOException;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

/**
 * Solves ALTCHA challenges the way the browser widget does, so tests can send a payload a real registration would send.
 * Only practical with a small {@code hopps.altcha.counter-max}.
 */
public final class AltchaTestSolver {

    private static final HexFormat HEX = HexFormat.of();
    private static final ObjectMapper JSON = new ObjectMapper();

    private AltchaTestSolver() {
    }

    /**
     * @param parameters
     *            the challenge parameters as received
     * @param signature
     *            the challenge signature as received
     *
     * @return the base64 payload the widget would produce for this challenge
     */
    public static String solve(Map<String, ?> parameters, String signature) {
        byte[] nonce = HEX.parseHex((String) parameters.get("nonce"));
        byte[] salt = HEX.parseHex((String) parameters.get("salt"));
        int cost = ((Number) parameters.get("cost")).intValue();
        String keyPrefix = (String) parameters.get("keyPrefix");
        for (long counter = 0; counter <= 10_000; counter++) {
            String derivedKey = HEX.formatHex(AltchaService.deriveKey(nonce, salt, counter, cost));
            if (derivedKey.startsWith(keyPrefix)) {
                return encode(Map.of(
                        "challenge", Map.of("parameters", parameters, "signature", signature),
                        "solution", Map.of("counter", counter, "derivedKey", derivedKey)));
            }
        }
        throw new IllegalStateException("No solution within 10000 attempts; is hopps.altcha.counter-max that small?");
    }

    static String encode(Object payload) {
        try {
            return Base64.getEncoder().encodeToString(JSON.writeValueAsBytes(payload));
        } catch (JsonProcessingException e) {
            throw new UncheckedIOException(e);
        }
    }
}
