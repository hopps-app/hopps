package app.hopps.shared.altcha;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Issues and verifies ALTCHA proof-of-work challenges (protocol version 2, PBKDF2/SHA-256), compatible with the
 * {@code altcha} browser widget and with {@code altcha-lib}, which has no Java port.
 * <p>
 * A challenge is created in altcha-lib's deterministic mode: the server picks the counter, derives its key and
 * publishes the first half as {@code keyPrefix}. The browser tries counters from zero until a key starts with that
 * prefix, which takes {@link AltchaConfig#counterMin()} to {@link AltchaConfig#counterMax()} attempts. The parameters
 * are signed, and so is the full key ({@code keySignature}), so checking a solution costs one HMAC instead of a key
 * derivation.
 * <p>
 * Challenges are stateless until redeemed. A redeemed challenge is remembered in memory until it expires, so it cannot
 * be used twice; with several replicas each one only knows its own, which bounds a replay to one use per replica.
 */
@Singleton
public class AltchaService {

    private static final Logger LOG = LoggerFactory.getLogger(AltchaService.class);

    static final String ALGORITHM = "PBKDF2/SHA-256";
    static final int KEY_LENGTH = 32;
    static final Duration CHALLENGE_LIFETIME = Duration.ofMinutes(5);

    /** Generous bound for an encoded payload; a genuine one is about 900 characters. */
    private static final int MAX_PAYLOAD_LENGTH = 4096;
    private static final long MAX_COUNTER = 0xFFFF_FFFFL;
    private static final Set<String> TEXT_PARAMETERS = Set.of("algorithm", "keyPrefix", "keySignature", "nonce",
            "salt");
    private static final Set<String> NUMBER_PARAMETERS = Set.of("cost", "expiresAt", "keyLength");
    private static final Pattern HEX = Pattern.compile("(?:[0-9a-f]{2})+");
    private static final HexFormat HEX_FORMAT = HexFormat.of();
    private static final ObjectMapper JSON = new ObjectMapper();

    private final AltchaConfig config;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    private final byte[] signatureSecret;
    private final byte[] keySignatureSecret;
    /** Nonces of redeemed challenges, mapped to their expiry in epoch seconds. */
    private final Map<String, Long> redeemed = new ConcurrentHashMap<>();

    @Inject
    public AltchaService(AltchaConfig config) {
        this(config, Clock.systemUTC());
    }

    AltchaService(AltchaConfig config, Clock clock) {
        if (config.cost() < 1 || config.counterMin() < 0 || config.counterMax() < config.counterMin()) {
            throw new IllegalStateException(
                    "hopps.altcha needs cost >= 1 and 0 <= counter-min <= counter-max");
        }
        this.config = config;
        this.clock = clock;
        String secret = config.hmacSecret().filter(s -> !s.isBlank()).orElseGet(() -> {
            LOG.info("hopps.altcha.hmac-secret is not set; signing ALTCHA challenges with a random secret. "
                    + "Set HOPPS_ALTCHA_HMAC_SECRET before running more than one replica.");
            return HEX_FORMAT.formatHex(randomBytes(32));
        });
        this.signatureSecret = secret.getBytes(StandardCharsets.UTF_8);
        // Derived like altcha-lib's deriveHmacKeySecret, so one secret means the same in both implementations.
        this.keySignatureSecret = HEX_FORMAT
                .formatHex(hmac("derived-secret".getBytes(StandardCharsets.UTF_8), signatureSecret))
                .getBytes(StandardCharsets.UTF_8);
    }

    /**
     * A challenge as the widget expects it from its {@code challenge} URL.
     *
     * @param parameters
     *            the signed challenge parameters, keys in alphabetical order
     * @param signature
     *            HMAC-SHA256 of the parameters as canonical JSON, in hex
     */
    @Schema(description = "An ALTCHA proof-of-work challenge (protocol version 2), solved by the altcha widget")
    public record Challenge(SortedMap<String, Object> parameters, String signature) {
    }

    /**
     * @return a fresh challenge, valid for {@link #CHALLENGE_LIFETIME} and for one registration
     */
    public Challenge createChallenge() {
        byte[] nonce = randomBytes(16);
        byte[] salt = randomBytes(16);
        int counter = config.counterMin() + random.nextInt(config.counterMax() - config.counterMin() + 1);
        byte[] key = deriveKey(nonce, salt, counter, config.cost());

        SortedMap<String, Object> parameters = new TreeMap<>();
        parameters.put("algorithm", ALGORITHM);
        parameters.put("cost", config.cost());
        parameters.put("expiresAt", clock.instant().plus(CHALLENGE_LIFETIME).getEpochSecond());
        parameters.put("keyLength", KEY_LENGTH);
        // The browser has to find the counter whose key starts with this half; the other half stays unknown to it.
        parameters.put("keyPrefix", HEX_FORMAT.formatHex(Arrays.copyOf(key, KEY_LENGTH / 2)));
        parameters.put("keySignature", HEX_FORMAT.formatHex(hmac(keySignatureSecret, key)));
        parameters.put("nonce", HEX_FORMAT.formatHex(nonce));
        parameters.put("salt", HEX_FORMAT.formatHex(salt));
        return new Challenge(parameters, sign(parameters));
    }

    /**
     * Requires {@code payload} to solve a challenge issued here that has neither expired nor been used, and marks it as
     * used. Does nothing while ALTCHA is switched off.
     *
     * @param payload
     *            the base64 payload the widget produced
     *
     * @throws AltchaFailedException
     *             if it does not
     */
    public void requireSolved(String payload) {
        if (config.enabled() && !redeem(payload)) {
            throw new AltchaFailedException();
        }
    }

    /**
     * @return whether {@code payload} solves a valid, unexpired, unused challenge; if so, it is now used
     */
    boolean redeem(String payload) {
        Optional<Submission> parsed = parse(payload);
        if (parsed.isEmpty()) {
            return false;
        }
        Submission submission = parsed.get();
        long now = clock.instant().getEpochSecond();
        if (submission.expiresAt() < now
                || !constantTimeEquals(sign(submission.parameters()), submission.signature())
                || !constantTimeEquals(
                        HEX_FORMAT.formatHex(hmac(keySignatureSecret, HEX_FORMAT.parseHex(submission.derivedKey()))),
                        submission.keySignature())) {
            return false;
        }
        redeemed.values().removeIf(expiresAt -> expiresAt < now);
        return redeemed.putIfAbsent(submission.nonce(), submission.expiresAt()) == null;
    }

    /** The parts of a widget payload needed to verify it, already checked for shape and type. */
    private record Submission(SortedMap<String, Object> parameters, String signature, String derivedKey) {

        String nonce() {
            return (String) parameters.get("nonce");
        }

        String keySignature() {
            return (String) parameters.get("keySignature");
        }

        long expiresAt() {
            return (Long) parameters.get("expiresAt");
        }
    }

    /**
     * Decodes {@code base64(JSON {challenge: {parameters, signature}, solution: {counter, derivedKey}})}. The
     * parameters must be exactly the ones {@link #createChallenge()} issues, so their canonical JSON can be rebuilt
     * from typed values instead of re-serializing whatever the client sent.
     */
    private static Optional<Submission> parse(String payload) {
        if (payload == null || payload.isBlank() || payload.length() > MAX_PAYLOAD_LENGTH) {
            return Optional.empty();
        }
        JsonNode root;
        try {
            root = JSON.readTree(Base64.getDecoder().decode(payload.strip()));
        } catch (IllegalArgumentException | IOException e) {
            return Optional.empty();
        }
        if (root == null) {
            return Optional.empty();
        }
        JsonNode challenge = root.path("challenge");
        JsonNode parameters = challenge.path("parameters");
        JsonNode solution = root.path("solution");
        if (!parameters.isObject()
                || parameters.size() != TEXT_PARAMETERS.size() + NUMBER_PARAMETERS.size()
                || !isHex(challenge.path("signature"))
                || !isHex(solution.path("derivedKey"))
                || solution.path("derivedKey").asText().length() != 2 * KEY_LENGTH
                || !isCounter(solution.path("counter"))) {
            return Optional.empty();
        }

        SortedMap<String, Object> typed = new TreeMap<>();
        for (String name : TEXT_PARAMETERS) {
            JsonNode value = parameters.path(name);
            if (!value.isTextual() || (!"algorithm".equals(name) && !isHex(value))) {
                return Optional.empty();
            }
            typed.put(name, value.asText());
        }
        for (String name : NUMBER_PARAMETERS) {
            JsonNode value = parameters.path(name);
            if (!value.isIntegralNumber() || !value.canConvertToLong()) {
                return Optional.empty();
            }
            typed.put(name, value.asLong());
        }
        if (!ALGORITHM.equals(typed.get("algorithm"))) {
            return Optional.empty();
        }
        return Optional.of(new Submission(typed, challenge.path("signature").asText(),
                solution.path("derivedKey").asText()));
    }

    private static boolean isHex(JsonNode node) {
        return node.isTextual() && HEX.matcher(node.asText()).matches();
    }

    private static boolean isCounter(JsonNode node) {
        return node.isIntegralNumber() && node.canConvertToLong() && node.asLong() >= 0
                && node.asLong() <= MAX_COUNTER;
    }

    /** HMAC of the parameters as JSON with sorted keys and no whitespace, like altcha-lib's canonicalJSON. */
    private String sign(SortedMap<String, Object> parameters) {
        try {
            return HEX_FORMAT.formatHex(hmac(signatureSecret,
                    JSON.writeValueAsString(parameters).getBytes(StandardCharsets.UTF_8)));
        } catch (JsonProcessingException e) {
            throw new UncheckedIOException(e);
        }
    }

    /**
     * PBKDF2-HMAC-SHA256 with the nonce followed by the counter as a big-endian uint32 as password, as the widget
     * computes it. The password is binary, which {@code PBEKeySpec} cannot take (it encodes chars), and a
     * {@link #KEY_LENGTH 32-byte} key is exactly one PBKDF2 block.
     */
    static byte[] deriveKey(byte[] nonce, byte[] salt, long counter, int cost) {
        byte[] password = ByteBuffer.allocate(nonce.length + Integer.BYTES)
                .put(nonce)
                .putInt((int) counter)
                .array();
        Mac mac = mac(password);
        mac.update(salt);
        mac.update(new byte[] { 0, 0, 0, 1 });
        byte[] block = mac.doFinal();
        byte[] key = block.clone();
        for (int i = 1; i < cost; i++) {
            block = mac.doFinal(block);
            for (int j = 0; j < key.length; j++) {
                key[j] ^= block[j];
            }
        }
        return key;
    }

    private static byte[] hmac(byte[] key, byte[] data) {
        return mac(key).doFinal(data);
    }

    private static Mac mac(byte[] key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac;
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 is not available", e);
        }
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                actual.getBytes(StandardCharsets.US_ASCII));
    }

    private byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        random.nextBytes(bytes);
        return bytes;
    }
}
