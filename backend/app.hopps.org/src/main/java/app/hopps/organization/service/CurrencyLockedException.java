package app.hopps.organization.service;

import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;

/**
 * The organization already has transactions, so its currency is fixed. Answered as 409 Conflict with the stable code
 * {@link #CODE} in the same {@code {code, message}} shape as the other coded errors, so the client can show a specific
 * explanation instead of a generic save failure.
 */
public class CurrencyLockedException extends ClientErrorException {

    public static final String CODE = "CURRENCY_LOCKED";

    public CurrencyLockedException() {
        super("The currency cannot be changed once the organization has transactions",
                Response.status(Response.Status.CONFLICT)
                        .type(MediaType.APPLICATION_JSON)
                        .entity(Map.of("code", CODE, "message",
                                "The currency cannot be changed once the organization has transactions. "
                                        + "Delete all transactions first or contact support."))
                        .build());
    }
}
