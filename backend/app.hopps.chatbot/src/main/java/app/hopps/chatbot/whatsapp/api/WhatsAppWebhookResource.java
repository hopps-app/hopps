package app.hopps.chatbot.whatsapp.api;

import app.hopps.chatbot.receipt.service.ReceiptIntakeService;
import app.hopps.chatbot.whatsapp.api.dto.InboundMessage;
import app.hopps.chatbot.whatsapp.api.dto.WebhookPayload;
import app.hopps.chatbot.whatsapp.config.WhatsAppConfig;
import app.hopps.chatbot.whatsapp.service.WhatsAppSignatureVerifier;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.context.ManagedExecutor;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.List;
import java.util.Objects;

/**
 * Webhook the WhatsApp Cloud API calls for every message sent to the Hopps business number.
 */
@Path("/webhooks/whatsapp")
public class WhatsAppWebhookResource {

    private static final Logger LOG = LoggerFactory.getLogger(WhatsAppWebhookResource.class);

    private final WhatsAppConfig config;
    private final WhatsAppSignatureVerifier signatureVerifier;
    private final ReceiptIntakeService receiptIntakeService;
    private final ObjectMapper objectMapper;
    private final ManagedExecutor executor;

    public WhatsAppWebhookResource(WhatsAppConfig config, WhatsAppSignatureVerifier signatureVerifier,
            ReceiptIntakeService receiptIntakeService, ObjectMapper objectMapper, ManagedExecutor executor) {
        this.config = config;
        this.signatureVerifier = signatureVerifier;
        this.receiptIntakeService = receiptIntakeService;
        this.objectMapper = objectMapper;
        this.executor = executor;
    }

    @GET
    @Produces(MediaType.TEXT_PLAIN)
    @Operation(summary = "Verify the webhook", description = "Called once by Meta when the webhook URL is registered. "
            + "Echoes the challenge if the verify token matches.")
    @APIResponse(responseCode = "200", description = "Token matches, challenge returned")
    @APIResponse(responseCode = "403", description = "Wrong mode or verify token")
    public Response verify(
            @QueryParam("hub.mode") @Parameter(description = "Always 'subscribe'") String mode,
            @QueryParam("hub.verify_token") @Parameter(description = "Token configured in the Meta app") String token,
            @QueryParam("hub.challenge") @Parameter(description = "Value to echo back") String challenge) {
        if ("subscribe".equals(mode) && Objects.equals(config.verifyToken(), token) && challenge != null) {
            return Response.ok(challenge).build();
        }
        LOG.warn("Rejected WhatsApp webhook verification: mode={}", mode);
        return Response.status(Response.Status.FORBIDDEN).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Receive WhatsApp notifications", description = "Accepts incoming messages signed with the "
            + "app secret and processes them asynchronously, so Meta gets its 200 right away and does not retry.")
    @APIResponse(responseCode = "200", description = "Notification accepted")
    @APIResponse(responseCode = "400", description = "Body is not a valid webhook payload")
    @APIResponse(responseCode = "401", description = "Missing or invalid X-Hub-Signature-256")
    public Response receive(
            @HeaderParam("X-Hub-Signature-256") @Parameter(description = "HMAC-SHA256 of the body") String signature,
            byte[] body) {
        if (!signatureVerifier.isValid(body, signature)) {
            LOG.warn("Rejected WhatsApp webhook call with invalid signature");
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        WebhookPayload payload;
        try {
            payload = objectMapper.readValue(body, WebhookPayload.class);
        } catch (IOException e) {
            LOG.warn("Could not parse WhatsApp webhook payload: {}", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).build();
        }

        for (InboundMessage message : messagesOf(payload)) {
            executor.runAsync(() -> receiptIntakeService.handle(message))
                    .exceptionally(e -> {
                        LOG.error("Handling WhatsApp message {} failed", message.id(), e);
                        return null;
                    });
        }
        return Response.ok().build();
    }

    static List<InboundMessage> messagesOf(WebhookPayload payload) {
        if (payload == null || payload.entry() == null) {
            return List.of();
        }
        return payload.entry()
                .stream()
                .filter(entry -> entry.changes() != null)
                .flatMap(entry -> entry.changes().stream())
                .filter(change -> "messages".equals(change.field()) && change.value() != null
                        && change.value().messages() != null)
                .flatMap(change -> change.value().messages().stream())
                .toList();
    }
}
