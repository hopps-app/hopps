package app.hopps.whatsapp.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import app.hopps.whatsapp.api.dto.WhatsAppContactResponse;
import app.hopps.whatsapp.api.dto.WhatsAppInviteRequest;
import app.hopps.whatsapp.api.dto.WhatsAppInviteResponse;
import app.hopps.whatsapp.domain.WhatsAppContact;
import app.hopps.whatsapp.repository.WhatsAppContactRepository;
import app.hopps.whatsapp.service.WhatsAppInviteService;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
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
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * Manages the WhatsApp invite of a bommel and the phone numbers connected through it. Every member of the organization
 * may do this, like for the upload link.
 */
@Authenticated
@Path("/whatsapp-invites")
public class WhatsAppInviteResource {

    @Inject
    WhatsAppInviteService inviteService;

    @Inject
    WhatsAppContactRepository contactRepository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    OrganizationContext organizationContext;

    @Inject
    SecurityIdentity securityIdentity;

    @GET
    @Path("/{bommelId}")
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "getBommelWhatsAppInvite", summary = "Get the WhatsApp invite of a bommel", description = "Returns the bommel's WhatsApp invite with its code and join link. Answers 204 without a body when the bommel has no invite.")
    @APIResponse(responseCode = "200", description = "Invite found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = WhatsAppInviteResponse.class)))
    // 204 (no invite) is deliberately not listed: NSwag then resolves it as null instead of throwing.
    @APIResponse(responseCode = "401", description = "Not authenticated")
    @APIResponse(responseCode = "404", description = "Bommel not found in the current organization")
    public Response getInvite(@PathParam("bommelId") @Parameter(description = "The bommel ID") Long bommelId) {
        Bommel bommel = findBommelInCurrentOrganization(bommelId);
        return inviteService.find(bommel)
                .map(invite -> Response.ok(WhatsAppInviteResponse.from(invite, inviteService.joinUrl(invite))).build())
                .orElseGet(() -> Response.noContent().build());
    }

    @POST
    @Path("/{bommelId}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(operationId = "regenerateBommelWhatsAppInvite", summary = "Create or regenerate the WhatsApp invite of a bommel", description = "Creates a new invite with a fresh code. An existing invite of the bommel is replaced and its code stops working; numbers that already joined stay connected.")
    @APIResponse(responseCode = "200", description = "Invite created", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = WhatsAppInviteResponse.class)))
    @APIResponse(responseCode = "400", description = "Expiry date is in the past")
    @APIResponse(responseCode = "401", description = "Not authenticated")
    @APIResponse(responseCode = "404", description = "Bommel not found in the current organization")
    public WhatsAppInviteResponse regenerateInvite(
            @PathParam("bommelId") @Parameter(description = "The bommel ID") Long bommelId,
            WhatsAppInviteRequest request) {
        Bommel bommel = findBommelInCurrentOrganization(bommelId);
        Instant expiresAt = request != null ? request.expiresAt() : null;
        if (expiresAt != null && !expiresAt.isAfter(Instant.now())) {
            throw new BadRequestException("Expiry date must be in the future");
        }
        String principal = securityIdentity.getPrincipal().getName();
        var invite = inviteService.regenerate(bommel, expiresAt, principal);
        return WhatsAppInviteResponse.from(invite, inviteService.joinUrl(invite));
    }

    @DELETE
    @Path("/{bommelId}")
    @Transactional
    @Operation(operationId = "revokeBommelWhatsAppInvite", summary = "Turn WhatsApp off for a bommel", description = "Deletes the bommel's WhatsApp invite and disconnects every phone number that joined it.")
    @APIResponse(responseCode = "204", description = "Invite revoked and numbers disconnected (or there was nothing)")
    @APIResponse(responseCode = "401", description = "Not authenticated")
    @APIResponse(responseCode = "404", description = "Bommel not found in the current organization")
    public void revokeInvite(@PathParam("bommelId") @Parameter(description = "The bommel ID") Long bommelId) {
        inviteService.revoke(findBommelInCurrentOrganization(bommelId));
    }

    @GET
    @Path("/{bommelId}/contacts")
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "getBommelWhatsAppContacts", summary = "List the phone numbers connected to a bommel", description = "Returns the numbers that joined the bommel's WhatsApp invite, newest first. Numbers are masked.")
    @APIResponse(responseCode = "200", description = "Connected numbers", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(type = SchemaType.ARRAY, implementation = WhatsAppContactResponse.class)))
    @APIResponse(responseCode = "401", description = "Not authenticated")
    @APIResponse(responseCode = "404", description = "Bommel not found in the current organization")
    public List<WhatsAppContactResponse> getContacts(
            @PathParam("bommelId") @Parameter(description = "The bommel ID") Long bommelId) {
        return inviteService.contacts(findBommelInCurrentOrganization(bommelId))
                .stream()
                .map(WhatsAppContactResponse::from)
                .toList();
    }

    @DELETE
    @Path("/{bommelId}/contacts/{contactId}")
    @Transactional
    @Operation(operationId = "removeBommelWhatsAppContact", summary = "Disconnect a phone number from a bommel", description = "Removes one connected number; receipts it sends are no longer accepted until it joins again.")
    @APIResponse(responseCode = "204", description = "Number disconnected")
    @APIResponse(responseCode = "401", description = "Not authenticated")
    @APIResponse(responseCode = "404", description = "Bommel or contact not found")
    public void removeContact(
            @PathParam("bommelId") @Parameter(description = "The bommel ID") Long bommelId,
            @PathParam("contactId") @Parameter(description = "The contact ID") Long contactId) {
        Bommel bommel = findBommelInCurrentOrganization(bommelId);
        WhatsAppContact contact = contactRepository.findById(contactId);
        if (contact == null || !Objects.equals(contact.getBommel().id, bommel.id)) {
            throw new NotFoundException("Contact not found");
        }
        contactRepository.delete(contact);
    }

    private Bommel findBommelInCurrentOrganization(Long bommelId) {
        Organization organization = organizationContext.getCurrentOrganization();
        Bommel bommel = bommelRepository.findById(bommelId);
        if (organization == null || bommel == null
                || !Objects.equals(bommelRepository.getOrganization(bommel).getId(), organization.getId())) {
            throw new NotFoundException("Bommel not found");
        }
        return bommel;
    }
}
