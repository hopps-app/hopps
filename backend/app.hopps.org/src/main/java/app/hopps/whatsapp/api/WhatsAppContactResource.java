package app.hopps.whatsapp.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.member.domain.Member;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import app.hopps.whatsapp.api.dto.WhatsAppContactResponse;
import app.hopps.whatsapp.api.dto.WhatsAppInvitationRequest;
import app.hopps.whatsapp.domain.WhatsAppContact;
import app.hopps.whatsapp.repository.WhatsAppContactRepository;
import app.hopps.whatsapp.service.WhatsAppContactService;
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
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.util.List;
import java.util.Objects;

/**
 * Who may send receipts for a bommel via WhatsApp: members invite a person by name and number, hopps sends the
 * invitation, and the person accepts it in WhatsApp. Every member of the organization may do this, like for the upload
 * link.
 */
@Authenticated
@Path("/whatsapp-contacts/{bommelId}")
public class WhatsAppContactResource {

    @Inject
    WhatsAppContactService contactService;

    @Inject
    WhatsAppContactRepository contactRepository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    OrganizationContext organizationContext;

    @Inject
    SecurityIdentity securityIdentity;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "getBommelWhatsAppContacts", summary = "List the WhatsApp contacts of a bommel", description = "Returns invited, connected and declined numbers, newest invitation first. Numbers are masked.")
    @APIResponse(responseCode = "200", description = "Contacts", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(type = SchemaType.ARRAY, implementation = WhatsAppContactResponse.class)))
    @APIResponse(responseCode = "401", description = "Not authenticated")
    @APIResponse(responseCode = "404", description = "Bommel not found in the current organization")
    public List<WhatsAppContactResponse> getContacts(
            @PathParam("bommelId") @Parameter(description = "The bommel ID") Long bommelId) {
        return contactService.contacts(findBommelInCurrentOrganization(bommelId))
                .stream()
                .map(WhatsAppContactResponse::from)
                .toList();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(operationId = "inviteBommelWhatsAppContact", summary = "Invite a phone number via WhatsApp", description = "hopps sends a WhatsApp invitation with Accept/Decline buttons. Once accepted, receipts from the number are filed in the bommel. Inviting a number with an open or declined invitation sends a new one.")
    @APIResponse(responseCode = "200", description = "Invitation sent", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = WhatsAppContactResponse.class)))
    @APIResponse(responseCode = "400", description = "Name missing, or the number is invalid or lacks a country code")
    @APIResponse(responseCode = "401", description = "Not authenticated")
    @APIResponse(responseCode = "404", description = "Bommel not found in the current organization")
    @APIResponse(responseCode = "409", description = "The number is already connected to this bommel")
    @APIResponse(responseCode = "429", description = "Too many invitations from this organization")
    @APIResponse(responseCode = "503", description = "The invitation could not be sent; nothing was stored")
    public WhatsAppContactResponse invite(
            @PathParam("bommelId") @Parameter(description = "The bommel ID") Long bommelId,
            WhatsAppInvitationRequest request) {
        if (request == null) {
            throw new BadRequestException("Body is required");
        }
        Bommel bommel = findBommelInCurrentOrganization(bommelId);
        return WhatsAppContactResponse.from(contactService.invite(bommel, request.name(), request.phoneNumber(),
                inviterName(), principal()));
    }

    @POST
    @Path("/{contactId}/resend")
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(operationId = "resendBommelWhatsAppInvitation", summary = "Send a WhatsApp invitation again", description = "For an open, expired or declined invitation. The buttons of earlier invitations stop working.")
    @APIResponse(responseCode = "200", description = "Invitation sent", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = WhatsAppContactResponse.class)))
    @APIResponse(responseCode = "401", description = "Not authenticated")
    @APIResponse(responseCode = "404", description = "Bommel or contact not found")
    @APIResponse(responseCode = "409", description = "The number is already connected")
    @APIResponse(responseCode = "429", description = "Too many invitations from this organization")
    @APIResponse(responseCode = "503", description = "The invitation could not be sent")
    public WhatsAppContactResponse resend(
            @PathParam("bommelId") @Parameter(description = "The bommel ID") Long bommelId,
            @PathParam("contactId") @Parameter(description = "The contact ID") Long contactId) {
        WhatsAppContact contact = findContact(bommelId, contactId);
        return WhatsAppContactResponse.from(contactService.resend(contact, inviterName(), principal()));
    }

    @DELETE
    @Path("/{contactId}")
    @Transactional
    @Operation(operationId = "removeBommelWhatsAppContact", summary = "Remove a WhatsApp contact", description = "Disconnects the number or withdraws its invitation; its buttons stop working and receipts from it are no longer accepted.")
    @APIResponse(responseCode = "204", description = "Contact removed")
    @APIResponse(responseCode = "401", description = "Not authenticated")
    @APIResponse(responseCode = "404", description = "Bommel or contact not found")
    public void remove(
            @PathParam("bommelId") @Parameter(description = "The bommel ID") Long bommelId,
            @PathParam("contactId") @Parameter(description = "The contact ID") Long contactId) {
        contactRepository.delete(findContact(bommelId, contactId));
    }

    private WhatsAppContact findContact(Long bommelId, Long contactId) {
        Bommel bommel = findBommelInCurrentOrganization(bommelId);
        WhatsAppContact contact = contactRepository.findById(contactId);
        if (contact == null || !Objects.equals(contact.getBommel().id, bommel.id)) {
            throw new NotFoundException("Contact not found");
        }
        return contact;
    }

    /** Name shown in the invitation: the member's full name, falling back to the login. */
    private String inviterName() {
        Member member = organizationContext.getCurrentMember();
        if (member != null) {
            String fullName = String.join(" ",
                    Objects.toString(member.getFirstName(), ""), Objects.toString(member.getLastName(), "")).strip();
            if (!fullName.isEmpty()) {
                return fullName;
            }
        }
        return principal();
    }

    private String principal() {
        return securityIdentity.getPrincipal().getName();
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
