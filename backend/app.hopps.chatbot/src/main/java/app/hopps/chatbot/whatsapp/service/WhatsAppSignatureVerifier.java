package app.hopps.chatbot.whatsapp.service;

import app.hopps.chatbot.whatsapp.config.WhatsAppConfig;
import jakarta.enterprise.context.ApplicationScoped;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Checks the {@code X-Hub-Signature-256} header Meta adds to every webhook call: an HMAC-SHA256 of the raw request
 * body, keyed with the app secret. Without this check anybody who knows the URL could inject messages.
 */
@ApplicationScoped
public class WhatsAppSignatureVerifier {

    private static final String PREFIX = "sha256=";
    private static final String ALGORITHM = "HmacSHA256";

    private final byte[] appSecret;

    public WhatsAppSignatureVerifier(WhatsAppConfig config) {
        this.appSecret = config.appSecret().getBytes(StandardCharsets.UTF_8);
    }

    public boolean isValid(byte[] body, String signatureHeader) {
        if (body == null || signatureHeader == null || !signatureHeader.startsWith(PREFIX)) {
            return false;
        }
        byte[] expected;
        try {
            expected = HexFormat.of().parseHex(signatureHeader.substring(PREFIX.length()));
        } catch (IllegalArgumentException e) {
            return false;
        }
        return MessageDigest.isEqual(sign(body), expected);
    }

    public byte[] sign(byte[] body) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(appSecret, ALGORITHM));
            return mac.doFinal(body);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 is not available", e);
        }
    }
}
