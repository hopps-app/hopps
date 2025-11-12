package app.hopps.document.client;

import app.hopps.document.domain.Data;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

import java.util.List;

@RegisterRestClient(configKey = "fin-narrator")
@Path("/api/fin-narrator/tag")
public interface FinNarratorClient {
    @POST
    @Path("invoice")
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    List<String> tagInvoice(Data jsonData);

    @POST
    @Path("receipt")
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    List<String> tagReceipt(Data jsonData);
}
