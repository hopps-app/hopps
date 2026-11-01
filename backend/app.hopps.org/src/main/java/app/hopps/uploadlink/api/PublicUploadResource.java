package app.hopps.uploadlink.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.DocumentDirection;
import app.hopps.document.domain.UploadChannel;
import app.hopps.document.service.DocumentUploadService;
import app.hopps.organization.domain.Organization;
import app.hopps.uploadlink.api.dto.PublicUploadLinkInfo;
import app.hopps.uploadlink.api.dto.PublicUploadResponse;
import app.hopps.uploadlink.domain.BommelUploadLink;
import app.hopps.uploadlink.service.UploadLinkService;
import app.hopps.uploadlink.service.UploadRateLimiter;
import io.vertx.core.http.HttpServerRequest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The receiving end of a bommel's upload link. Public: whoever has the link can see whose receipts are collected and
 * submit receipts, one file per request. The submitted documents run through the normal upload flow, including the
 * analysis.
 */
@Path("/public/upload-links/{token}")
public class PublicUploadResource {
    private static final Logger LOG = LoggerFactory.getLogger(PublicUploadResource.class);
    private static final int MAX_NAME_LENGTH = 255;
    private static final int MAX_COMMENT_LENGTH = 2000;

    @Inject
    UploadLinkService uploadLinkService;

    @Inject
    UploadRateLimiter rateLimiter;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    DocumentUploadService documentUploadService;

    @Context
    HttpServerRequest httpRequest;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(operationId = "getPublicUploadLink", summary = "Describe an upload link", description = "Returns the organization and bommel an upload link collects receipts for. Public; no authentication required.")
    @APIResponse(responseCode = "200", description = "Upload link is active", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PublicUploadLinkInfo.class)))
    @APIResponse(responseCode = "404", description = "Unknown or revoked upload link")
    @APIResponse(responseCode = "410", description = "Upload link has expired")
    public PublicUploadLinkInfo getUploadLinkInfo(
            @PathParam("token") @Parameter(description = "The upload link token") String token) {
        BommelUploadLink link = uploadLinkService.resolveActive(token);
        Bommel bommel = link.getBommel();
        Organization organization = bommelRepository.getOrganization(bommel);
        return new PublicUploadLinkInfo(organization.getName(), bommel.getName(), bommel.getEmoji(),
                link.getExpiresAt());
    }

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(operationId = "submitPublicReceipt", summary = "Submit a receipt through an upload link", description = "Uploads one receipt file (PNG, JPEG or PDF) for the link's bommel and starts its analysis. Public; no authentication required. Rate-limited per link and client.")
    @APIResponse(responseCode = "201", description = "Receipt submitted", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PublicUploadResponse.class)))
    @APIResponse(responseCode = "400", description = "Missing file or name, or a field is too long")
    @APIResponse(responseCode = "404", description = "Unknown or revoked upload link")
    @APIResponse(responseCode = "409", description = "This receipt has already been uploaded")
    @APIResponse(responseCode = "410", description = "Upload link has expired")
    @APIResponse(responseCode = "415", description = "File type not allowed or file content does not match it")
    @APIResponse(responseCode = "429", description = "Too many uploads through this link from this client")
    public Response submitReceipt(
            @PathParam("token") @Parameter(description = "The upload link token") String token,
            @RestForm("file") FileUpload file,
            @RestForm("name") @Parameter(description = "Name of the submitter (required)") String name,
            @RestForm("comment") @Parameter(description = "Optional note for the treasurer") String comment,
            @RestForm("privatelyPaid") @Parameter(description = "Whether the submitter paid privately") boolean privatelyPaid) {
        BommelUploadLink link = uploadLinkService.resolveActive(token);
        rateLimiter.acquire(link.id + ":" + httpRequest.remoteAddress().hostAddress());

        String submitter = name != null ? name.strip() : "";
        if (submitter.isEmpty()) {
            throw new BadRequestException("Name is required");
        }
        if (submitter.length() > MAX_NAME_LENGTH) {
            throw new BadRequestException("Name is too long");
        }
        String note = comment != null && !comment.isBlank() ? comment.strip() : null;
        if (note != null && note.length() > MAX_COMMENT_LENGTH) {
            throw new BadRequestException("Comment is too long");
        }
        DocumentUploadService.validateFileContent(file);

        Bommel bommel = link.getBommel();
        Organization organization = bommelRepository.getOrganization(bommel);
        try {
            documentUploadService.upload(organization, file, submitter, DocumentDirection.INCOMING, true, document -> {
                document.setBommel(bommel);
                document.setUploadChannel(UploadChannel.UPLOAD_LINK);
                document.setUploaderComment(note);
                document.setPrivatelyPaid(privatelyPaid);
            });
        } catch (ClientErrorException e) {
            if (e.getResponse().getStatus() == Response.Status.CONFLICT.getStatusCode()) {
                // The in-app 409 names the existing document; the submitter must not learn its id.
                throw new ClientErrorException("This receipt has already been uploaded", Response.Status.CONFLICT);
            }
            throw e;
        }
        LOG.info("Receipt submitted through upload link: linkId={}, bommelId={}", link.id, bommel.id);
        return Response.status(Response.Status.CREATED).entity(new PublicUploadResponse(file.fileName())).build();
    }
}
