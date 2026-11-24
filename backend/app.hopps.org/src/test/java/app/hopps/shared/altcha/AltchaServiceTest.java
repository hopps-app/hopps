package app.hopps.shared.altcha;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Checks the Java implementation against payloads from altcha-lib, the reference implementation the browser widget is
 * built on, and against its own challenges.
 */
class AltchaServiceTest {

    /*
     * Created with altcha-lib 2.8.0: createChallenge({algorithm: 'PBKDF2/SHA-256', cost: 1000, counter: 7, expiresAt:
     * 2099-01-01, hmacSignatureSecret: SECRET, hmacKeySignatureSecret: deriveHmacKeySecret(SECRET)}), solved with its
     * solveChallenge and accepted by its verifySolution.
     */
    private static final String SECRET = "altcha-test-secret";
    private static final String NONCE = "83b8ae018403da04d6757b187e89b6fb";
    private static final String SALT = "ce7f6dbff9875b1f074299464d954661";
    private static final String DERIVED_KEY = "2a247249ad63d5a8a81de31343b59367f9908f1fc98c340f32116ecaa7cbc505";
    private static final String REFERENCE_PAYLOAD = "eyJjaGFsbGVuZ2UiOnsicGFyYW1ldGVycyI6eyJhbGdvcml0aG0iOiJQQktERjIvU0hBLTI1NiIsImNvc3QiOjEwMDAsImV4cGlyZXNBdCI6NDA3MDkwODgwMCwia2V5TGVuZ3RoIjozMiwia2V5UHJlZml4IjoiMmEyNDcyNDlhZDYzZDVhOGE4MWRlMzEzNDNiNTkzNjciLCJrZXlTaWduYXR1cmUiOiJlYzI4MzIyOWNmZDc4MWMyN2JkN2NlM2E5NjA5YjQ4OWZiODlmYmM5YTRmOGZlMWU2YzRkNTE1MTJmM2YxZWJhIiwibm9uY2UiOiI4M2I4YWUwMTg0MDNkYTA0ZDY3NTdiMTg3ZTg5YjZmYiIsInNhbHQiOiJjZTdmNmRiZmY5ODc1YjFmMDc0Mjk5NDY0ZDk1NDY2MSJ9LCJzaWduYXR1cmUiOiJkZTk1ZDAyZDU0OGI4N2YzYThhYzM4NWVjODcxMzgxZWMwYWRhMTkyZTk5NTYzNGIyOTQ2MGM2Y2E5NTU0Nzk2In0sInNvbHV0aW9uIjp7ImNvdW50ZXIiOjcsImRlcml2ZWRLZXkiOiIyYTI0NzI0OWFkNjNkNWE4YTgxZGUzMTM0M2I1OTM2N2Y5OTA4ZjFmYzk4YzM0MGYzMjExNmVjYWE3Y2JjNTA1IiwidGltZSI6NC43fX0=";
    /** What the widget sends in its test mode, which must never pass. */
    private static final String WIDGET_TEST_MODE_PAYLOAD = Base64.getEncoder()
            .encodeToString("{\"challenge\":null,\"solution\":null,\"test\":true}".getBytes());

    private static final Instant NOW = Instant.parse("2026-11-10T12:00:00Z");
    private static final ObjectMapper JSON = new ObjectMapper();

    record TestConfig(boolean enabled, Optional<String> hmacSecret, int cost, int counterMin, int counterMax)
            implements
            AltchaConfig {
    }

    private static AltchaService service(String secret, Instant now) {
        return new AltchaService(new TestConfig(true, Optional.of(secret), 1000, 1, 20),
                Clock.fixed(now, ZoneOffset.UTC));
    }

    /** The reference payload with one field of its JSON replaced. */
    private static String withChanged(String path, String field, Object value) throws Exception {
        ObjectNode root = (ObjectNode) JSON.readTree(Base64.getDecoder().decode(REFERENCE_PAYLOAD));
        ObjectNode node = (ObjectNode) root.at(path);
        node.set(field, JSON.valueToTree(value));
        return AltchaTestSolver.encode(root);
    }

    @Test
    @DisplayName("derives the same key as altcha-lib")
    void derivesTheSameKeyAsAltchaLib() {
        byte[] key = AltchaService.deriveKey(HexFormat.of().parseHex(NONCE), HexFormat.of().parseHex(SALT), 7, 1000);

        assertEquals(DERIVED_KEY, HexFormat.of().formatHex(key));
    }

    @Test
    @DisplayName("accepts a challenge issued and solved by altcha-lib with the same secret")
    void acceptsAltchaLibPayload() {
        assertTrue(service(SECRET, NOW).redeem(REFERENCE_PAYLOAD));
    }

    @Test
    @DisplayName("accepts a challenge only once")
    void rejectsReplay() {
        AltchaService altcha = service(SECRET, NOW);

        assertTrue(altcha.redeem(REFERENCE_PAYLOAD));
        assertFalse(altcha.redeem(REFERENCE_PAYLOAD));
    }

    @Test
    @DisplayName("rejects a challenge signed with another secret")
    void rejectsOtherSecret() {
        assertFalse(service("another-secret", NOW).redeem(REFERENCE_PAYLOAD));
    }

    @Test
    @DisplayName("rejects an expired challenge")
    void rejectsExpired() {
        assertFalse(service(SECRET, Instant.parse("2099-01-01T00:00:01Z")).redeem(REFERENCE_PAYLOAD));
    }

    @Test
    @DisplayName("rejects changed parameters, such as a lower cost")
    void rejectsTamperedParameters() throws Exception {
        assertFalse(service(SECRET, NOW).redeem(withChanged("/challenge/parameters", "cost", 1)));
        assertFalse(service(SECRET, NOW).redeem(withChanged("/challenge/parameters", "expiresAt", 4102444800L)));
    }

    @Test
    @DisplayName("rejects a key that is not the solution")
    void rejectsWrongKey() throws Exception {
        String wrongKey = DERIVED_KEY.substring(0, DERIVED_KEY.length() - 1) + "0";

        assertFalse(service(SECRET, NOW).redeem(withChanged("/solution", "derivedKey", wrongKey)));
    }

    @Test
    @DisplayName("rejects parameters the server never issues")
    void rejectsExtraParameters() throws Exception {
        assertFalse(service(SECRET, NOW).redeem(withChanged("/challenge/parameters", "data", Map.of("a", "b"))));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = { "   ", "not base64!", "e30=", "bnVsbA==", "WyJhIl0=" })
    @DisplayName("rejects malformed payloads")
    void rejectsMalformed(String payload) {
        assertFalse(service(SECRET, NOW).redeem(payload));
    }

    @Test
    @DisplayName("rejects the widget's test mode")
    void rejectsWidgetTestMode() {
        assertFalse(service(SECRET, NOW).redeem(WIDGET_TEST_MODE_PAYLOAD));
    }

    @Test
    @DisplayName("issues challenges that solve and redeem like altcha-lib's")
    void solvesOwnChallenge() {
        AltchaService altcha = service(SECRET, NOW);
        AltchaService.Challenge challenge = altcha.createChallenge();

        assertEquals("PBKDF2/SHA-256", challenge.parameters().get("algorithm"));
        assertEquals(NOW.plusSeconds(300).getEpochSecond(), challenge.parameters().get("expiresAt"));
        assertEquals(32, ((String) challenge.parameters().get("keyPrefix")).length());
        assertTrue(altcha.redeem(AltchaTestSolver.solve(challenge.parameters(), challenge.signature())));
    }

    @Test
    @DisplayName("requireSolved throws ALTCHA_FAILED for an invalid payload and passes a valid one")
    void requireSolved() {
        AltchaService altcha = service(SECRET, NOW);

        AltchaFailedException failure = assertThrows(AltchaFailedException.class,
                () -> altcha.requireSolved(null));
        assertEquals(400, failure.getResponse().getStatus());
        assertDoesNotThrow(() -> altcha.requireSolved(REFERENCE_PAYLOAD));
    }

    @Test
    @DisplayName("requireSolved accepts anything while ALTCHA is switched off")
    void requireSolvedWhenDisabled() {
        AltchaService altcha = new AltchaService(new TestConfig(false, Optional.empty(), 1000, 1, 20),
                Clock.fixed(NOW, ZoneOffset.UTC));

        assertDoesNotThrow(() -> altcha.requireSolved(null));
    }
}
