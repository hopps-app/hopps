package app.hopps.document.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.messaging.DocumentAnalysisMessage;
import app.hopps.document.messaging.DocumentProducer;
import app.hopps.document.service.SubmitService;
import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.infrastructure.storage.S3Handler;
import app.hopps.transaction.domain.AnalysisStatus;
import app.hopps.transaction.domain.TransactionRecord;
import app.hopps.transaction.domain.TransactionRecordAnalysisResult;
import app.hopps.transaction.domain.TransactionStatus;
import app.hopps.transaction.repository.AnalysisResultRepository;
import app.hopps.transaction.repository.TransactionRecordRepository;
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

    @Inject
    TransactionRecordRepository transactionRepo;

    @Inject
    AnalysisResultRepository analysisResultRepo;

    @Inject
    DocumentProducer documentProducer;

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
    @Operation(summary = "Uploads a document and creates a transaction record. Analysis runs asynchronously.")
    @APIResponse(responseCode = "202", description = "Document accepted for processing", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(contentSchema = DocumentUploadResponse.class), example = """
            {
                "transactionRecordId": 42,
                "documentKey": "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
                "status": "PENDING",
                "analysisStatus": "QUEUED",
                "_links": {
                    "self": "/transaction-records/42",
                    "analysis": "/transaction-records/42/analysis",
                    "events": "/transaction-records/42/events",
                    "document": "/document/a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6"
                }
            }"""))
    @APIResponse(responseCode = "400", description = """
            Invalid input, either invalid bommel/bommel from another org, missing 'file' or 'type' inputs,
            the user not being attached to exactly one organisation,
            or an invalid MIME type on the uploaded file.
            """)
    public Response uploadDocument(
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

        // Create transaction record and analysis result in a separate transaction
        Long transactionRecordId = createTransactionRecordAndAnalysis(
                documentKey.toString(),
                type,
                privatelyPaid,
                bommelId,
                securityContext.getUserPrincipal().getName()
        );

        // Queue document for asynchronous analysis AFTER transaction commit
        DocumentAnalysisMessage analysisMessage = new DocumentAnalysisMessage(
                transactionRecordId,
                documentKey.toString(),
                type,
                file.contentType(),
                bommelId,
                privatelyPaid,
                securityContext.getUserPrincipal().getName()
        );
        documentProducer.queueForAnalysis(analysisMessage);

        // Return 202 Accepted immediately
        DocumentUploadResponse response = DocumentUploadResponse.create(
                transactionRecordId,
                documentKey.toString(),
                TransactionStatus.PENDING,
                AnalysisStatus.QUEUED
        );

        return Response.accepted(response).build();
    }

    /**
     * Create transaction record and analysis result in a separate transaction.
     * This ensures the transaction is committed before the Kafka message is sent.
     */
    @Transactional
    Long createTransactionRecordAndAnalysis(
            String documentKey,
            DocumentType type,
            boolean privatelyPaid,
            Long bommelId,
            String uploaderName) {

        // Create transaction record with PENDING status
        TransactionRecord transactionRecord = new TransactionRecord();
        transactionRecord.setDocumentKey(documentKey);
        transactionRecord.setDocument(type);
        transactionRecord.setPrivatelyPaid(privatelyPaid);
        transactionRecord.setBommelId(bommelId);
        transactionRecord.setUploader(uploaderName);
        transactionRecord.setStatus(TransactionStatus.PENDING);
        transactionRepo.persist(transactionRecord);

        // Create analysis result placeholder
        TransactionRecordAnalysisResult analysisResult = new TransactionRecordAnalysisResult(transactionRecord);
        analysisResult.setStatus(AnalysisStatus.QUEUED);
        analysisResultRepo.persist(analysisResult);

        // Flush to ensure ID is generated
        transactionRepo.flush();

        return transactionRecord.getId();
    }
}
