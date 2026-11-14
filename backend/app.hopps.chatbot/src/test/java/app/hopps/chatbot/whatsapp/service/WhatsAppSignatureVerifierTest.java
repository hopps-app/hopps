package app.hopps.chatbot.whatsapp.service;

import app.hopps.chatbot.whatsapp.config.WhatsAppConfig;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WhatsAppSignatureVerifierTest {

    private static final byte[] BODY = "{\"object\":\"whatsapp_business_account\"}".getBytes(StandardCharsets.UTF_8);

    private final WhatsAppSignatureVerifier verifier = verifierWithSecret("secret");

    @Test
    void acceptsSignatureOfBody() {
        String header = "sha256=" + HexFormat.of().formatHex(verifier.sign(BODY));

        assertTrue(verifier.isValid(BODY, header));
    }

    @Test
    void rejectsSignatureMadeWithOtherSecret() {
        String header = "sha256=" + HexFormat.of().formatHex(verifierWithSecret("other").sign(BODY));

        assertFalse(verifier.isValid(BODY, header));
    }

    @Test
    void rejectsMissingOrMalformedHeader() {
        assertFalse(verifier.isValid(BODY, null));
        assertFalse(verifier.isValid(BODY, "sha1=abc"));
        assertFalse(verifier.isValid(BODY, "sha256=not-hex"));
    }

    private static WhatsAppSignatureVerifier verifierWithSecret(String secret) {
        WhatsAppConfig config = Mockito.mock(WhatsAppConfig.class);
        Mockito.when(config.appSecret()).thenReturn(secret);
        return new WhatsAppSignatureVerifier(config);
    }
}
