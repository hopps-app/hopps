package app.hopps.organization.service.authentik;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.annotation.RegisterClientHeaders;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

/**
 * The slice of Authentik's REST API (<a href="https://api.goauthentik.io/">reference</a>) that
 * {@link AuthentikIdentityProvisioningService} needs: finding, creating and deleting users, and a recovery email or
 * link in place of Keycloak's invitation email. There is no official Authentik client for Java (only Go, Python, Rust
 * and TypeScript), hence this hand-written slice instead of a pulled-in SDK like {@code keycloak-admin-client}.
 */
@Path("/api/v3/core")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@RegisterRestClient(configKey = "authentik-api")
@RegisterClientHeaders(AuthentikAuthHeadersFactory.class)
public interface AuthentikApi {

    @GET
    @Path("/users/")
    AuthentikList<AuthentikUser> findUsersByEmail(@QueryParam("email") String email);

    @GET
    @Path("/users/")
    AuthentikList<AuthentikUser> findUsersByUuid(@QueryParam("uuid") String uuid);

    @POST
    @Path("/users/")
    AuthentikUser createUser(AuthentikUserRequest request);

    /**
     * Sends the email stage twice because Authentik moved it: older versions (e.g. 2024.12) read it from the query
     * string, current ones from the JSON body. Each ignores the other.
     */
    @POST
    @Path("/users/{id}/recovery_email/")
    void sendRecoveryEmail(@PathParam("id") long id, @QueryParam("email_stage") String emailStage,
            AuthentikRecoveryRequest request);

    /**
     * Creates a set-password link without sending it anywhere. Needs a recovery flow on the Authentik brand. The link's
     * host is the one this client calls Authentik with, so that has to be a URL the invited person can open too.
     */
    @POST
    @Path("/users/{id}/recovery/")
    AuthentikLink createRecoveryLink(@PathParam("id") long id, AuthentikRecoveryRequest request);

    @DELETE
    @Path("/users/{id}/")
    void deleteUser(@PathParam("id") long id);
}
