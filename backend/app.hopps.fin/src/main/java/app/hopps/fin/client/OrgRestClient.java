package app.hopps.fin.client;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@RegisterRestClient(configKey = "org-service")
public interface OrgRestClient {
    @GET
    @Path("bommel/{id}")
    Bommel getBommel(@PathParam("id") Long id);
}
