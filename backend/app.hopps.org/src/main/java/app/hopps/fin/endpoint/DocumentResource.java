package app.hopps.fin.endpoint;

import app.hopps.fin.S3Handler;
import app.hopps.fin.bpmn.SubmitService;
import app.hopps.fin.jpa.entities.TransactionRecord;
import app.hopps.fin.model.DocumentType;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.jboss.resteasy.reactive.PartType;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.Optional;
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
    public TransactionRecord uploadDocument(
            @RestForm("file") FileUpload file,
            @RestForm @PartType(MediaType.TEXT_PLAIN) Optional<Long> bommelId,
            @RestForm("privatelyPaid") @PartType(MediaType.TEXT_PLAIN) boolean privatelyPaid,
            @RestForm("type") @PartType(MediaType.TEXT_PLAIN) DocumentType type) throws IOException {
        if (file == null || type == null) {
            throw new BadRequestException(
                    Response.status(Response.Status.BAD_REQUEST).entity("'file' or 'type' not set!").build());
        }

        if (!ALLOWED_DOCUMENT_TYPES.contains(file.contentType())) {
            throw new ClientErrorException(Response.status(Response.Status.UNSUPPORTED_MEDIA_TYPE)
                    .entity("Invalid content type, allowed values: " + ALLOWED_DOCUMENT_TYPES)
                    .build());
        }

        if (bommelId.isEmpty()) {
            // TODO: Get root bommel of the organisation this user is attached to
            throw new BadRequestException(
                    Response.status(Response.Status.BAD_REQUEST).entity("'bommelId' not set!").build());
        }

        // TODO: Check this bommel ID is in the same organisation as the user

        UUID documentKey = UUID.randomUUID();
        LOG.info("Uploading document (documentKey={}, bommel={})", documentKey, bommelId);
        byte[] fileContents = Files.readAllBytes(file.uploadedFile());
        s3Handler.saveFile(documentKey.toString(), file.contentType(), fileContents);

        SubmitService.DocumentSubmissionRequest request = new SubmitService.DocumentSubmissionRequest(
                documentKey.toString(),
                bommelId.get(),
                type,
                privatelyPaid,
                securityContext.getUserPrincipal().getName(),
                file.contentType(),
                fileContents);

        return submitService.submitDocument(request);
    }
}
