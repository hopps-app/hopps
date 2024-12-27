package app.hopps.fin_narrator;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.Arrays;
import java.util.List;

public class TaggingResource {

    @Inject
    AiService aiService;

    @GET
    @Produces(MediaType.TEXT_PLAIN)
    public String hello() {
        return "Hello from Quarkus REST";
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public List<String> tagInvoice(String jsonData) {
        String output = aiService.tagReceiptOrInvoice("invoice", jsonData);
        return Arrays.stream(output.split(","))
                .map(String::trim)
                .toList();
    }
}
