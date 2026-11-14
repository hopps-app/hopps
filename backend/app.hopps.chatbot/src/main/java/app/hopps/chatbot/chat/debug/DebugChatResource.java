package app.hopps.chatbot.chat.debug;

import app.hopps.chatbot.chat.model.Attachment;
import app.hopps.chatbot.chat.model.IncomingChatMessage;
import app.hopps.chatbot.chat.service.ChatService;
import app.hopps.chatbot.org.client.dto.OrgConnection;
import app.hopps.chatbot.org.service.OrgGateway;
import io.quarkus.arc.profile.UnlessBuildProfile;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/**
 * Browser chat for trying the bot without WhatsApp. It talks to the same {@link ChatService} as the WhatsApp webhook,
 * with a phone number the user picks, so invites, STOP and receipt uploads behave exactly as on WhatsApp. Not part of
 * prod builds: it has no authentication.
 */
@Path("/debug/chat")
@UnlessBuildProfile("prod")
public class DebugChatResource {

    static final String CONVERSATION_PREFIX = "debug:";

    private final ChatService chatService;
    private final OrgGateway org;

    public DebugChatResource(ChatService chatService, OrgGateway org) {
        this.chatService = chatService;
        this.org = org;
    }

    @GET
    @Produces(MediaType.TEXT_HTML)
    @Operation(summary = "Debug chat page", description = "HTML page to chat with the bot (dev and test only). "
            + "Accepts ?text= like a wa.me link, so WhatsApp invite links of a dev org open here.")
    @APIResponse(responseCode = "200", description = "The page")
    public String page() throws IOException {
        try (InputStream in = getClass().getResourceAsStream("/debug/chat.html")) {
            if (in == null) {
                throw new IllegalStateException("debug/chat.html missing from the classpath");
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @POST
    @Path("/messages")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Send a debug chat message", description = "Sends text and/or a file through the "
            + "chat pipeline as if the given phone number had sent it via WhatsApp (dev and test only)")
    @APIResponse(responseCode = "200", description = "Reply of the bot")
    @APIResponse(responseCode = "400", description = "Phone number missing")
    public DebugChatReply send(
            @RestForm String conversationId,
            @RestForm String phoneNumber,
            @RestForm String senderName,
            @RestForm String text,
            @RestForm("file") FileUpload file) throws IOException {
        String phone = requirePhoneNumber(phoneNumber);
        Attachment attachment = null;
        if (file != null) {
            // Read now: the upload's temp file is gone once this request ends.
            byte[] content = Files.readAllBytes(file.uploadedFile());
            attachment = new Attachment(file.contentType(), file.fileName(), () -> content);
        }
        String reply = chatService.handle(new IncomingChatMessage(CONVERSATION_PREFIX + conversationId, phone,
                blankToNull(senderName), text, attachment));
        return new DebugChatReply(reply);
    }

    @GET
    @Path("/connection")
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Connection of a phone number", description = "Which bommel the number is connected to "
            + "(dev and test only)")
    @APIResponse(responseCode = "200", description = "Connection, or connected=false")
    public DebugConnection connection(@QueryParam("phoneNumber") String phoneNumber) {
        String phone = requirePhoneNumber(phoneNumber);
        try {
            return org.findConnection(phone)
                    .map(DebugConnection::of)
                    .orElse(new DebugConnection(false, null, null, null));
        } catch (RuntimeException e) {
            return new DebugConnection(false, null, null, "org not reachable: " + e.getMessage());
        }
    }

    private static String requirePhoneNumber(String phoneNumber) {
        String digits = phoneNumber == null ? "" : phoneNumber.replaceAll("\\D", "");
        if (digits.length() < 6) {
            throw new BadRequestException("phoneNumber is required (international format, e.g. 4917612345678)");
        }
        return digits;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    public record DebugChatReply(String reply) {
    }

    public record DebugConnection(boolean connected, String organizationName, String bommelLabel, String error) {
        static DebugConnection of(OrgConnection connection) {
            return new DebugConnection(true, connection.organizationName(), connection.bommelLabel(), null);
        }
    }
}
