package app.hopps.whatsapp.client;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.annotation.ClientHeaderParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

/**
 * The chatbot service's internal API. Authenticated with the same shared token the chatbot uses towards org.
 */
@Path("/internal")
@RegisterRestClient(configKey = "chatbot")
@ClientHeaderParam(name = "X-Hopps-Internal-Token", value = "${hopps.internal-api.token}")
public interface ChatbotClient {

    /** Sends the WhatsApp invitation (a template message with Accept/Decline buttons). */
    @POST
    @Path("/invitations")
    // Invitations carry emojis and umlauts: state the charset instead of relying on defaults.
    @Consumes(MediaType.APPLICATION_JSON + ";charset=UTF-8")
    void sendInvitation(ChatbotInvitation invitation);
}
