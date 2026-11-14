package app.hopps.chatbot.shared;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.resteasy.reactive.server.ServerRequestFilter;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Optional;

/**
 * Guards {@code /internal/*}, the API org calls (sending invitations). Same shared token as towards org, in
 * {@value #HEADER}. Without a configured token the internal API does not exist (404).
 */
public class InternalApiFilter {
    public static final String HEADER = "X-Hopps-Internal-Token";
    private static final String PREFIX = "internal";

    @ConfigProperty(name = "hopps.chatbot.org.internal-token")
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
