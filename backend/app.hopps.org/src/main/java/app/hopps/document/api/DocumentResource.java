package app.hopps.document.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.service.SubmitService;
import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.infrastructure.storage.S3Handler;
import app.hopps.transaction.domain.TransactionRecord;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Authenticated
@Path("/document")
public class DocumentResource {
    private static final Logger LOG = LoggerFactory.getLogger(DocumentResource.class);

    private static final List<String> ALLOWED_DOCUMENT_TYPES = List.of("image/png", "image/jpeg", "application/pdf");

    @Inject
    S3Handler s3Handler;

    @Inject
    SubmitService submitService;

    @Inject
    SecurityContext securityContext;

    @Inject
    BommelRepository bommelRepo;

    @Inject
    MemberRepository memberRepo;

    @GET
    @Path("{documentKey}")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public byte[] getDocumentByKey(@PathParam("documentKey") String documentKey) {
        // TODO: How to verify that user has access? --> FGAC
        // TODO: Set the media type header dynamic dependent on PNG, JPEG or PDF
        // Go against the database get the bommel id then towards openfga?
        try {
            return s3Handler.getFile(documentKey);
        } catch (NoSuchKeyException ignored) {
            LOG.info("File with key {} not found", documentKey);
            throw new NotFoundException(Response.status(Response.Status.NOT_FOUND)
                    .entity("Document with key " + documentKey + " not found")
                    .build());
        }
    }

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(summary = "Uploads a document, creates a transaction record for it and attaches that to a bommel.")
    @APIResponse(responseCode = "200", description = "Newly created transaction record", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(contentSchema = TransactionRecord.class), example = """
            {
                "id": 1,
                "bommelId": 23,
                "documentKey": "0deb7f16-3521-4fdf-9bf4-ac097fef2d9e",
                "uploader": "alice@example.test",
                "total": 89.9,
                "privatelyPaid": false,
                "document": "INVOICE",
                "transactionTime": "2024-07-17T22:00:00Z",
                "sender": null,
                "recipient": null,
                "tags": [ "consulting", "services" ],
                "name": "Herr Max Mustermann",
                "orderNumber": "20249324596397",
                "invoiceId": "20249324596397",
                "dueDate": null,
                "amountDue": null,
                "currencyCode": "EUR"
            }"""))
    @APIResponse(responseCode = "400", description = """
            Invalid input, either invalid bommel/bommel from another org, missing 'file' or 'type' inputs,
            the user not being attached to exactly one organisation,
            or an invalid MIME type on the uploaded file.
            """)
    public TransactionRecord uploadDocument(
            @RestForm("file") FileUpload file,
            @RestForm("bommelId") Long bommelId,
            @RestForm("privatelyPaid") boolean privatelyPaid,
            @RestForm("type") DocumentType type) throws IOException {
        if (file == null || type == null) {
            throw new BadRequestException(
                    Response.status(Response.Status.BAD_REQUEST).entity("'file' or 'type' not set!").build());
        }

        if (!ALLOWED_DOCUMENT_TYPES.contains(file.contentType())) {
            throw new ClientErrorException(Response.status(Response.Status.UNSUPPORTED_MEDIA_TYPE)
                    .entity("Invalid content type, allowed values: " + ALLOWED_DOCUMENT_TYPES)
                    .build());
        }

        Member member = memberRepo.find("email", securityContext.getUserPrincipal().getName()).firstResult();

        if (member == null) {
            throw new ClientErrorException(
                    Response.status(Response.Status.UNAUTHORIZED).entity("Member not found in database").build());
        }

        var orgs = member.getOrganizations();

        if (orgs.isEmpty()) {
            throw new BadRequestException(Response.status(Response.Status.BAD_REQUEST)
                    .entity("Member is not part of an organisation")
                    .build());
        }

        if (orgs.size() > 1) {
            throw new BadRequestException(Response.status(Response.Status.BAD_REQUEST)
                    .entity("User (currently) cannot be part of multiple organisations")
                    .build());
        }

        Organization userOrganisation = orgs.stream().findFirst().get();

        if (bommelId == null) {
            // if the user didn't supply an id, we'll just default to their organisation's root bommel
            bommelId = userOrganisation.getRootBommel().id;
        } else {
            // if the user did supply an id, make sure it exists and is in the correct organisation
            Bommel bommel = bommelRepo.findById(bommelId);

            if (bommel == null) {
                throw new BadRequestException(
                        Response.status(Response.Status.BAD_REQUEST).entity("Bommel not found").build());
            }

            Organization bommelOrganisation = bommelRepo.getOrganization(bommel);

            if (!Objects.equals(bommelOrganisation.getId(), userOrganisation.getId())) {
                throw new BadRequestException(
                        Response.status(Response.Status.BAD_REQUEST).entity("Bommel not found").build());
            }
        }

        UUID documentKey = UUID.randomUUID();
        LOG.info("Uploading document (documentKey={}, bommel={})", documentKey, bommelId);
        byte[] fileContents = Files.readAllBytes(file.uploadedFile());
        s3Handler.saveFile(documentKey.toString(), file.contentType(), fileContents);

        SubmitService.DocumentSubmissionRequest request = new SubmitService.DocumentSubmissionRequest(
                documentKey.toString(),
                bommelId,
                type,
                privatelyPaid,
                securityContext.getUserPrincipal().getName(),
                file.contentType(),
                fileContents);

        return submitService.submitDocument(request);
    }
}
