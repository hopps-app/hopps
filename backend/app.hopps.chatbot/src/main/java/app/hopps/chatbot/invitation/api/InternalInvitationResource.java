package app.hopps.chatbot.invitation.api;

import app.hopps.chatbot.invitation.service.InvitationSender;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * Called by org when a member invites a phone number to a bommel. Protected by the internal API token.
 */
@Path("/internal/invitations")
public class InternalInvitationResource {

    private final InvitationSender sender;

    public InternalInvitationResource(InvitationSender sender) {
        this.sender = sender;
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Send a WhatsApp invitation (org only)", description = "Sends the invitation template with "
            + "Accept/Decline buttons, or puts it into the debug chat's inbox in dev.")
    @APIResponse(responseCode = "204", description = "Invitation sent")
    @APIResponse(responseCode = "400", description = "Missing fields")
    @APIResponse(responseCode = "401", description = "Missing or wrong internal API token")
    @APIResponse(responseCode = "502", description = "WhatsApp rejected the message")
    public void send(InvitationRequest request) {
        if (request == null || isBlank(request.phoneNumber()) || isBlank(request.token())
                || isBlank(request.bommelLabel())) {
            throw new BadRequestException("phoneNumber, token and bommelLabel are required");
        }
        sender.send(request);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
