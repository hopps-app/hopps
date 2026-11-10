package app.hopps.shared.altcha;

import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;

/**
 * The request carried no solved ALTCHA challenge, or one that is invalid, expired or already used. Answered as 400 with
 * the stable code {@link #CODE} in the same {@code {code, message}} shape as the other coded errors, so the client can
 * tell it apart from a failed field validation.
 */
public class AltchaFailedException extends ClientErrorException {

    public static final String CODE = "ALTCHA_FAILED";

    public AltchaFailedException() {
        super("The spam check failed",
                Response.status(Response.Status.BAD_REQUEST)
                        .type(MediaType.APPLICATION_JSON)
                        .entity(Map.of("code", CODE, "message",
                                "The spam check failed. Solve a new challenge and try again."))
                        .build());
    }
}
