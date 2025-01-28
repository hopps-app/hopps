package app.hopps.org.rest;

import io.quarkus.security.Authenticated;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Authenticated
@Path("/dashboard")
public class DashboardEndpoint {
    @GET
    @Path("tasks")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getOpenTasks() {
        // FIXME: Go against the IndexDataHandler with GraphQL?
        // unklar was hier genau gefetched werden muss. Sind aktuell keine Prozesse vorhanden die dies abbilden würden.
        return Response.ok().build();
    }

    @GET
    @Path("unpaid")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getUnpaidInvoices() {
        // FIXME: Go against the FIN-Service
        return Response.ok().build();
    }

    @GET
    @Path("revenue")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getCurrentRevenue() {
        // FIXME: Openfga is needed
        return Response.ok().build();
    }

    @GET
    @Path("members")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getMembersOfYourBommels() {
        // FIXME: Go through your bommels and get all members below
        return Response.ok().build();
    }
}
