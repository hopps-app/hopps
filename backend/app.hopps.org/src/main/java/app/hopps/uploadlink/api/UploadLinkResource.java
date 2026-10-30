package app.hopps.uploadlink.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import app.hopps.uploadlink.api.dto.UploadLinkRequest;
import app.hopps.uploadlink.api.dto.UploadLinkResponse;
import app.hopps.uploadlink.service.UploadLinkService;
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
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.time.Instant;
import java.util.Objects;

/**
 * Manages the public upload link of a bommel. Every member of the organization may do this; there is no dedicated
 * permission for it.
 */
@Authenticated
@Path("/upload-links")
public class UploadLinkResource {

    @Inject
    UploadLinkService uploadLinkService;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    OrganizationContext organizationContext;

    @Inject
    SecurityIdentity securityIdentity;

    @GET
    @Path("/{bommelId}")
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "getBommelUploadLink", summary = "Get the upload link of a bommel", description = "Returns the bommel's public upload link, including whether it has expired. Answers 204 without a body when the bommel has no link.")
    @APIResponse(responseCode = "200", description = "Upload link found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = UploadLinkResponse.class)))
    // 204 (no link) is deliberately not listed: NSwag then resolves it as null instead of throwing.
    @APIResponse(responseCode = "401", description = "Not authenticated")
    @APIResponse(responseCode = "404", description = "Bommel not found in the current organization")
    public Response getUploadLink(@PathParam("bommelId") @Parameter(description = "The bommel ID") Long bommelId) {
        Bommel bommel = findBommelInCurrentOrganization(bommelId);
        return uploadLinkService.find(bommel)
                .map(link -> Response.ok(UploadLinkResponse.from(link)).build())
                .orElseGet(() -> Response.noContent().build());
    }

    @POST
    @Path("/{bommelId}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(operationId = "regenerateBommelUploadLink", summary = "Create or regenerate the upload link of a bommel", description = "Creates a new public upload link with a fresh random token. An existing link of the bommel is replaced and stops working.")
    @APIResponse(responseCode = "200", description = "Upload link created", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = UploadLinkResponse.class)))
    @APIResponse(responseCode = "400", description = "Expiry date is in the past")
    @APIResponse(responseCode = "401", description = "Not authenticated")
    @APIResponse(responseCode = "404", description = "Bommel not found in the current organization")
    public UploadLinkResponse regenerateUploadLink(
            @PathParam("bommelId") @Parameter(description = "The bommel ID") Long bommelId,
            UploadLinkRequest request) {
        Bommel bommel = findBommelInCurrentOrganization(bommelId);
        Instant expiresAt = request != null ? request.expiresAt() : null;
        if (expiresAt != null && !expiresAt.isAfter(Instant.now())) {
            throw new BadRequestException("Expiry date must be in the future");
        }
        String principal = securityIdentity.getPrincipal().getName();
        return UploadLinkResponse.from(uploadLinkService.regenerate(bommel, expiresAt, principal));
    }

    @DELETE
    @Path("/{bommelId}")
    @Transactional
    @Operation(operationId = "revokeBommelUploadLink", summary = "Revoke the upload link of a bommel", description = "Deletes the bommel's public upload link; uploads through it are no longer accepted.")
    @APIResponse(responseCode = "204", description = "Upload link revoked (or there was none)")
    @APIResponse(responseCode = "401", description = "Not authenticated")
    @APIResponse(responseCode = "404", description = "Bommel not found in the current organization")
    public void revokeUploadLink(@PathParam("bommelId") @Parameter(description = "The bommel ID") Long bommelId) {
        uploadLinkService.revoke(findBommelInCurrentOrganization(bommelId));
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
