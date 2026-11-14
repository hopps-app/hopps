package app.hopps.chatbot.org.service;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.IOException;
import java.nio.file.Files;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stand-in for org's internal WhatsApp API, served by the test app itself (the org client points here in the test
 * profile). Mirrors the status codes org answers with.
 */
@Path("/internal/whatsapp")
public class FakeOrgInternalApi {
    static final String VALID_TOKEN = "valid-token";
    static final String EXPIRED_TOKEN = "expired-token";
    static final Map<String, String> CONNECTED = new ConcurrentHashMap<>();
    static volatile Received lastReceipt;

    record Received(String phoneNumber, String fileName, String contentType, byte[] content, String caption) {
    }

    @POST
    @Path("/invitations/{token}/accept")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response accept(@HeaderParam("X-Hopps-Internal-Token") String token, @PathParam("token") String invitation,
            Map<String, String> body) {
        if (!"dev-internal-token".equals(token)) {
            return Response.status(401).build();
        }
        if (invitation.equals(EXPIRED_TOKEN)) {
            return Response.status(410).build();
        }
        if (!invitation.equals(VALID_TOKEN)) {
            return Response.status(404).build();
        }
        CONNECTED.put(body.get("phoneNumber"), "Kiosk");
        return Response.ok(connection(null)).build();
    }

    @POST
    @Path("/invitations/{token}/decline")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response decline(@PathParam("token") String invitation, Map<String, String> body) {
        return invitation.equals(VALID_TOKEN) ? Response.noContent().build() : Response.status(404).build();
    }

    @GET
    @Path("/contacts/{phone}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response get(@PathParam("phone") String phone) {
        return CONNECTED.containsKey(phone) ? Response.ok(connection(null)).build() : Response.status(404).build();
    }

    @DELETE
    @Path("/contacts/{phone}")
    public void disconnect(@PathParam("phone") String phone) {
        CONNECTED.remove(phone);
    }

    @POST
    @Path("/contacts/{phone}/receipts")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response receipt(@PathParam("phone") String phone, @RestForm("file") FileUpload file,
            @RestForm("caption") String caption) throws IOException {
        if (!CONNECTED.containsKey(phone)) {
            return Response.status(404).build();
        }
        byte[] content = Files.readAllBytes(file.uploadedFile());
        if (lastReceipt != null && java.util.Arrays.equals(lastReceipt.content(), content)) {
            return Response.status(409).build();
        }
        lastReceipt = new Received(phone, file.fileName(), file.contentType(), content, caption);
        return Response.status(201).entity(Map.of("fileName", file.fileName(), "bommelName", "Kiosk")).build();
    }

    private static Map<String, Object> connection(String previous) {
        var result = new java.util.HashMap<String, Object>(Map.of("organizationName", "Testverein", "bommelId", 24,
                "bommelName", "Kiosk", "bommelEmoji", "🍺"));
        if (previous != null) {
            result.put("previousBommelName", previous);
        }
        return result;
    }
}
