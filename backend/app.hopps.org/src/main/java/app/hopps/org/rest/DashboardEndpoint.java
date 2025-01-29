package app.hopps.org.rest;

import app.hopps.org.fga.FgaProxy;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.SecurityContext;

import java.util.List;

@Authenticated
@Path("/dashboard")
public class DashboardEndpoint {
    private final FgaProxy fgaProxy;
    private final SecurityContext securityContext;

    @Inject
    public DashboardEndpoint(FgaProxy fgaProxy, SecurityContext securityContext) {
        this.fgaProxy = fgaProxy;
        this.securityContext = securityContext;
    }

    @GET
    @Path("tasks")
    @Produces(MediaType.APPLICATION_JSON)
    public int getOpenTasks() {
        // FIXME: Go against the IndexDataHandler with GraphQL?
        // unklar was hier genau gefetched werden muss. Sind aktuell keine Prozesse vorhanden die dies abbilden würden.
        return 0;
    }

    @GET
    @Path("members")
    @Produces(MediaType.APPLICATION_JSON)
    public int getMembersOfYourBommels() {
        List<Long> allMyBommels = fgaProxy.getAllMyBommels(securityContext.getUserPrincipal().getName());
        // TODO How to get the members from bommels?
        return allMyBommels.size();
    }
}
