package app.hopps.shared.security;

import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;

/**
 * The caller has a valid token but no organization to act in: either no {@code Member} is linked to their Keycloak id
 * at all (they logged in through Keycloak or a brokered identity provider without ever being invited), or the member
 * exists but belongs to no organization.
 * <p>
 * Always a 403 with the stable code {@link #CODE}, so clients can tell "you are not in" apart from a missing resource
 * and decide by themselves what to offer next — creating an organization on the hosted SaaS, or asking for an
 * invitation on a single-tenant installation.
 */
public class NoOrganizationAccessException extends ForbiddenException {

    public static final String CODE = "NO_ORGANIZATION_ACCESS";

    public NoOrganizationAccessException(String message) {
        super(message, Response.status(Response.Status.FORBIDDEN)
                .type(MediaType.APPLICATION_JSON)
                .entity(Map.of("code", CODE, "message", message))
                .build());
    }
}
