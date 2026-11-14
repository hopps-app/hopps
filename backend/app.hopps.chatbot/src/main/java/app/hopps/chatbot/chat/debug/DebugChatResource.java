package app.hopps.chatbot.chat.debug;

import app.hopps.chatbot.chat.model.Attachment;
import app.hopps.chatbot.chat.model.IncomingChatMessage;
import app.hopps.chatbot.chat.service.ChatService;
import io.quarkus.arc.profile.UnlessBuildProfile;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Browser chat for trying the bot without WhatsApp. It talks to the same {@link ChatService} as the WhatsApp webhook.
 * Not part of prod builds: it has no authentication.
 */
@Path("/debug/chat")
@UnlessBuildProfile("prod")
public class DebugChatResource {

    static final String CONVERSATION_PREFIX = "debug:";

    private final ChatService chatService;

    public DebugChatResource(ChatService chatService) {
        this.chatService = chatService;
    }

    @GET
    @Produces(MediaType.TEXT_HTML)
    @Operation(summary = "Debug chat page", description = "HTML page to chat with the bot (dev and test only)")
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
            + "chat pipeline as if it came from a messenger and returns the bot's reply (dev and test only)")
    @APIResponse(responseCode = "200", description = "Reply of the bot")
    public DebugChatReply send(
            @RestForm String conversationId,
            @RestForm String text,
            @RestForm("file") FileUpload file) {
        Attachment attachment = file == null ? null
                : new Attachment(file.contentType(), file.fileName(), file.uploadedFile().toString());
        String reply = chatService.handle(new IncomingChatMessage(CONVERSATION_PREFIX + conversationId, text,
                attachment));
        return new DebugChatReply(reply);
    }

    public record DebugChatReply(String reply) {
    }
}
