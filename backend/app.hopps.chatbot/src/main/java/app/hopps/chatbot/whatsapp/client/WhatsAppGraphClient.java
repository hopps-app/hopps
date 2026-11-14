package app.hopps.chatbot.whatsapp.client;

import app.hopps.chatbot.whatsapp.api.dto.OutboundTextMessage;
import app.hopps.chatbot.whatsapp.api.dto.MediaInfo;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

/**
 * Meta Graph API endpoints of the WhatsApp Cloud API.
 */
@Path("/{version}")
@RegisterRestClient(configKey = "whatsapp-graph")
public interface WhatsAppGraphClient {

    @POST
    @Path("/{phoneNumberId}/messages")
    @Consumes(MediaType.APPLICATION_JSON)
    void sendMessage(
            @PathParam("version") String version,
            @PathParam("phoneNumberId") String phoneNumberId,
            @HeaderParam("Authorization") String authorization,
            OutboundTextMessage message);

    @GET
    @Path("/{mediaId}")
    @Produces(MediaType.APPLICATION_JSON)
    MediaInfo getMedia(
            @PathParam("version") String version,
            @PathParam("mediaId") String mediaId,
            @HeaderParam("Authorization") String authorization);
}
