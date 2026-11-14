package app.hopps.shared.security;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.resteasy.reactive.server.ServerRequestFilter;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Optional;

/**
 * Guards {@code /internal/*}, the API other hopps services (the chatbot) call. They authenticate with a shared token in
 * {@value #HEADER}; the HTTP policy lets these paths through without OIDC. Without a configured token the internal API
 * does not exist (404), so a deployment that does not run the chatbot exposes nothing.
 */
public class InternalApiFilter {
    public static final String HEADER = "X-Hopps-Internal-Token";
    private static final String PREFIX = "internal";

    @ConfigProperty(name = "hopps.internal-api.token")
    Optional<String> token;

    @ServerRequestFilter(preMatching = true)
    public Response checkInternalToken(ContainerRequestContext requestContext) {
        String path = requestContext.getUriInfo().getPath();
        if (path.startsWith("/")) {
            path = path.substring(1);
        }
        if (!path.equals(PREFIX) && !path.startsWith(PREFIX + "/")) {
            return null;
        }
        if (token.isEmpty() || token.get().isBlank()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        String presented = requestContext.getHeaderString(HEADER);
        if (presented == null || !MessageDigest.isEqual(presented.getBytes(StandardCharsets.UTF_8),
                token.get().getBytes(StandardCharsets.UTF_8))) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        return null;
    }
}
