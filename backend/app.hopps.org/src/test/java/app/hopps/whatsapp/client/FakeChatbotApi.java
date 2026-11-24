package app.hopps.whatsapp.client;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.MediaType;

/**
 * Stand-in for the chatbot's internal invitation endpoint, served by the test app itself (the chatbot client points
 * here in the test profile). Records the raw body to check what org actually puts on the wire.
 */
@Path("/internal/invitations")
public class FakeChatbotApi {
    static volatile byte[] lastBody;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public void receive(byte[] body) {
        lastBody = body;
    }
}
