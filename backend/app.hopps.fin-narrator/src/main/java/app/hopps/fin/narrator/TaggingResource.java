package app.hopps.fin.narrator;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.json.JsonObject;
import jakarta.json.JsonValue;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.List;

@ApplicationScoped
@Path("tag")
public class TaggingResource {

    @Inject
    AiService aiService;

    @Inject
    ObjectMapper objectMapper;

    @ConfigProperty(name = "app.hopps.fin-narrator.tags.max-amount")
    int maxAmountOfTags;

    @ConfigProperty(name = "app.hopps.fin-narrator.max-input-length")
    int maxInputLength;

    @POST
    @Path("invoice")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public List<String> tagInvoice(JsonObject jsonData) throws JsonProcessingException {
        return tagDocument("invoicoe", jsonData);
    }

    @POST
    @Path("receipt")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public List<String> tagReceipt(JsonObject jsonData) throws JsonProcessingException {
        return tagDocument("receipt", jsonData);
    }

    private List<String> tagDocument(String type, JsonObject jsonData) throws JsonProcessingException {
        String input = objectMapper.writeValueAsString(jsonData);
        if (input.length() > maxInputLength) {
            throw new WebApplicationException(
                    "Max input length of " + maxInputLength + " chars reached",
                    Response.Status.BAD_REQUEST);
        }

        return aiService.tagReceiptOrInvoice(type, jsonData)
                .stream()
                .map(in -> in.replaceFirst("^ - ", ""))
                .map(String::trim)
                .map(String::toLowerCase)
                .limit(maxAmountOfTags)
                .toList();
    }
}
