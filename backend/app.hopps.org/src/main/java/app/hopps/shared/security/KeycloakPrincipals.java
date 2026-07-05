package app.hopps.shared.security;

import org.eclipse.microprofile.jwt.JsonWebToken;

import java.security.Principal;

/**
 * Helper for extracting the stable Keycloak user id (the JWT {@code sub} claim) from the current security principal.
 * <p>
 * The principal name ({@link Principal#getName()}) is the email (configured via {@code quarkus.oidc.token
 * .principal-claim=email}) and is used for human-readable audit fields. For linking a request to a {@code Member},
 * however, the immutable {@code sub} must be used instead of the mutable email.
 */
public final class KeycloakPrincipals {

    private KeycloakPrincipals() {
    }

    /**
     * Returns the Keycloak user id ({@code sub}) of the given principal, or {@code null} if the principal is not a
     * bearer-token principal (e.g. an anonymous or non-OIDC identity).
     */
    public static String keycloakId(Principal principal) {
        if (principal instanceof JsonWebToken jwt) {
            return jwt.getSubject();
        }
        return null;
    }
}
