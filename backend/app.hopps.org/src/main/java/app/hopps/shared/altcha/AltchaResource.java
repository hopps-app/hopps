package app.hopps.shared.altcha;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * Hands out ALTCHA challenges for the public registration form. Lives under {@code /public}, which needs no login.
 */
@Path("/public/altcha")
public class AltchaResource {

    @Inject
    AltchaService altchaService;

    @GET
    @Path("/challenge")
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Get a spam-protection challenge", description = "Issues a fresh ALTCHA proof-of-work challenge. The altcha widget in the registration form fetches and solves it, and the result goes along with the registration as `altcha`. A challenge is valid for five minutes and for one registration.")
    @APIResponse(responseCode = "200", description = "A new challenge", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = AltchaService.Challenge.class)))
    public Response getChallenge() {
        return Response.ok(altchaService.createChallenge())
                .header("Cache-Control", "no-store")
                .build();
    }
}
