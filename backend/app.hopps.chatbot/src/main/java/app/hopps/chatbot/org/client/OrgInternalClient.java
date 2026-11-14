package app.hopps.chatbot.org.client;

import app.hopps.chatbot.org.client.dto.InvitationAnswer;
import app.hopps.chatbot.org.client.dto.OrgConnection;
import app.hopps.chatbot.org.client.dto.ReceiptResponse;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.annotation.ClientHeaderParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.reactive.client.api.ClientMultipartForm;

/**
 * org's internal WhatsApp API. Authenticated with the shared internal API token.
 */
@Path("/internal/whatsapp")
@RegisterRestClient(configKey = "org")
@ClientHeaderParam(name = "X-Hopps-Internal-Token", value = "${hopps.chatbot.org.internal-token}")
public interface OrgInternalClient {

    @POST
    @Path("/invitations/{token}/accept")
    @Consumes(MediaType.APPLICATION_JSON + ";charset=UTF-8")
    @Produces(MediaType.APPLICATION_JSON)
    OrgConnection acceptInvitation(@PathParam("token") String token, InvitationAnswer answer);

    @POST
    @Path("/invitations/{token}/decline")
    @Consumes(MediaType.APPLICATION_JSON + ";charset=UTF-8")
    void declineInvitation(@PathParam("token") String token, InvitationAnswer answer);

    @GET
    @Path("/contacts/{phoneNumber}")
    @Produces(MediaType.APPLICATION_JSON)
    OrgConnection getConnection(@PathParam("phoneNumber") String phoneNumber);

    @DELETE
    @Path("/contacts/{phoneNumber}")
    void disconnect(@PathParam("phoneNumber") String phoneNumber);

    @POST
    @Path("/contacts/{phoneNumber}/receipts")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    ReceiptResponse submitReceipt(@PathParam("phoneNumber") String phoneNumber, ClientMultipartForm form);
}
