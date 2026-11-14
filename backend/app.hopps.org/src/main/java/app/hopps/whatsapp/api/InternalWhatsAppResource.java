package app.hopps.whatsapp.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.DocumentDirection;
import app.hopps.document.domain.UploadChannel;
import app.hopps.document.service.DocumentUploadService;
import app.hopps.organization.domain.Organization;
import app.hopps.uploadlink.service.UploadRateLimiter;
import app.hopps.whatsapp.api.dto.WhatsAppConnection;
import app.hopps.whatsapp.api.dto.WhatsAppInvitationAnswer;
import app.hopps.whatsapp.api.dto.WhatsAppReceiptForm;
import app.hopps.whatsapp.api.dto.WhatsAppReceiptResponse;
import app.hopps.whatsapp.domain.WhatsAppContact;
import app.hopps.whatsapp.service.WhatsAppContactService;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.BeanParam;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Called by the chatbot service only, never by the SPA: records answers to invitations, looks up and removes
 * connections, and files receipts from connected numbers. Protected by the internal API token (see
 * {@code InternalApiFilter}); the path must not be routed from the public ingress.
 */
@Path("/internal/whatsapp")
public class InternalWhatsAppResource {
    private static final Logger LOG = LoggerFactory.getLogger(InternalWhatsAppResource.class);
    private static final int MAX_CAPTION_LENGTH = 2000;

    @Inject
    WhatsAppContactService contactService;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    DocumentUploadService documentUploadService;

    @Inject
    UploadRateLimiter rateLimiter;

    @POST
    @Path("/invitations/{token}/accept")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(operationId = "internalAcceptWhatsAppInvitation", summary = "Accept a WhatsApp invitation (chatbot only)", description = "The number pressed Accept: connects it to the invitation's bommel; a number connected elsewhere moves. Pressing Accept again is harmless.")
    @APIResponse(responseCode = "200", description = "Number connected", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = WhatsAppConnection.class)))
    @APIResponse(responseCode = "400", description = "Invalid phone number")
    @APIResponse(responseCode = "401", description = "Missing or wrong internal API token")
    @APIResponse(responseCode = "404", description = "Unknown or replaced invitation, or another number")
    @APIResponse(responseCode = "410", description = "Invitation has expired")
    public WhatsAppConnection accept(
            @PathParam("token") @Parameter(description = "Token from the invitation's button") String token,
            WhatsAppInvitationAnswer answer) {
        WhatsAppContactService.AcceptResult result = contactService.accept(token, phoneOf(answer));
        Bommel bommel = result.contact().getBommel();
        LOG.info("WhatsApp invitation accepted: contactId={}, bommelId={}", result.contact().id, bommel.id);
        return WhatsAppConnection.of(bommelRepository.getOrganization(bommel), bommel, result.previousBommel());
    }

    @POST
    @Path("/invitations/{token}/decline")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(operationId = "internalDeclineWhatsAppInvitation", summary = "Decline a WhatsApp invitation (chatbot only)")
    @APIResponse(responseCode = "204", description = "Invitation declined")
    @APIResponse(responseCode = "401", description = "Missing or wrong internal API token")
    @APIResponse(responseCode = "404", description = "Unknown or replaced invitation, or another number")
    @APIResponse(responseCode = "410", description = "Invitation has expired")
    public void decline(
            @PathParam("token") @Parameter(description = "Token from the invitation's button") String token,
            WhatsAppInvitationAnswer answer) {
        WhatsAppContact contact = contactService.decline(token, phoneOf(answer));
        LOG.info("WhatsApp invitation declined: contactId={}", contact.id);
    }

    @GET
    @Path("/contacts/{phoneNumber}")
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(operationId = "internalGetWhatsAppConnection", summary = "Which bommel a phone number is connected to (chatbot only)")
    @APIResponse(responseCode = "200", description = "Number is connected", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = WhatsAppConnection.class)))
    @APIResponse(responseCode = "401", description = "Missing or wrong internal API token")
    @APIResponse(responseCode = "404", description = "Number is not connected")
    public WhatsAppConnection getConnection(
            @PathParam("phoneNumber") @Parameter(description = "Digits only, international format") String phoneNumber) {
        Bommel bommel = connectedContact(phoneNumber).getBommel();
        return WhatsAppConnection.of(bommelRepository.getOrganization(bommel), bommel, null);
    }

    @DELETE
    @Path("/contacts/{phoneNumber}")
    @Transactional
    @Operation(operationId = "internalDisconnectWhatsApp", summary = "Disconnect a phone number (chatbot only)", description = "Used when the sender writes STOP.")
    @APIResponse(responseCode = "204", description = "Number disconnected (or was not connected)")
    @APIResponse(responseCode = "401", description = "Missing or wrong internal API token")
    public void disconnect(
            @PathParam("phoneNumber") @Parameter(description = "Digits only, international format") String phoneNumber) {
        contactService.disconnect(phoneNumber);
    }

    @POST
    @Path("/contacts/{phoneNumber}/receipts")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(operationId = "internalSubmitWhatsAppReceipt", summary = "File a receipt from a connected number (chatbot only)", description = "Uploads one receipt (PNG, JPEG or PDF) into the number's bommel and starts its analysis.")
    @RequestBody(required = true, content = @Content(mediaType = MediaType.MULTIPART_FORM_DATA, schema = @Schema(ref = "WhatsAppReceiptForm")))
    @APIResponse(responseCode = "201", description = "Receipt filed", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = WhatsAppReceiptResponse.class)))
    @APIResponse(responseCode = "400", description = "Missing file or caption too long")
    @APIResponse(responseCode = "401", description = "Missing or wrong internal API token")
    @APIResponse(responseCode = "404", description = "Number is not connected")
    @APIResponse(responseCode = "409", description = "This receipt has already been uploaded")
    @APIResponse(responseCode = "415", description = "File type not allowed or file content does not match it")
    @APIResponse(responseCode = "429", description = "Too many uploads from this number")
    public Response submitReceipt(
            @PathParam("phoneNumber") @Parameter(description = "Digits only, international format") String phoneNumber,
            @BeanParam WhatsAppReceiptForm form) {
        WhatsAppContact contact = connectedContact(phoneNumber);
        rateLimiter.acquire("whatsapp-upload:" + contact.id);
        FileUpload file = form.file();
        if (file == null) {
            throw new BadRequestException("File is required");
        }
        String caption = form.caption() != null && !form.caption().isBlank() ? form.caption().strip() : null;
        if (caption != null && caption.length() > MAX_CAPTION_LENGTH) {
            throw new BadRequestException("Caption is too long");
        }
        DocumentUploadService.validateFileContent(file);

        Bommel bommel = contact.getBommel();
        Organization organization = bommelRepository.getOrganization(bommel);
        try {
            documentUploadService.upload(organization, file, contact.getName(), DocumentDirection.INCOMING, true,
                    document -> {
                        document.setBommel(bommel);
                        document.setUploadChannel(UploadChannel.WHATSAPP);
                        document.setUploaderComment(caption);
                    });
        } catch (ClientErrorException e) {
            if (e.getResponse().getStatus() == Response.Status.CONFLICT.getStatusCode()) {
                // The in-app 409 names the existing document; the sender must not learn its id.
                throw new ClientErrorException("This receipt has already been uploaded", Response.Status.CONFLICT);
            }
            throw e;
        }
        LOG.info("Receipt filed through WhatsApp: contactId={}, bommelId={}", contact.id, bommel.id);
        return Response.status(Response.Status.CREATED)
                .entity(new WhatsAppReceiptResponse(file.fileName(), bommel.getName()))
                .build();
    }

    private WhatsAppContact connectedContact(String phoneNumber) {
        return contactService.findActive(phoneNumber)
                .orElseThrow(() -> new NotFoundException("Phone number is not connected"));
    }

    private static String phoneOf(WhatsAppInvitationAnswer answer) {
        if (answer == null || answer.phoneNumber() == null) {
            throw new BadRequestException("phoneNumber is required");
        }
        return answer.phoneNumber();
    }
}
