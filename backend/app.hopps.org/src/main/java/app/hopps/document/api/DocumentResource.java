package app.hopps.document.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.api.dto.DocumentResponse;
import app.hopps.document.api.dto.DocumentUpdateRequest;
import app.hopps.document.domain.*;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.DocumentFileService;
import jakarta.enterprise.event.Event;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
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

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;

/**
 * REST API for document management. Handles document upload, retrieval, and updates.
 */
@Authenticated
@Path("/documents")
public class DocumentResource {
    private static final Logger LOG = LoggerFactory.getLogger(DocumentResource.class);
    private static final List<String> ALLOWED_CONTENT_TYPES = List.of(
            "image/png", "image/jpeg", "application/pdf");

    @Inject
    DocumentRepository documentRepository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    DocumentFileService fileService;

    @Inject
    Event<DocumentCreatedEvent> documentCreatedEvent;

    @Inject
    OrganizationContext organizationContext;

    @Inject
    SecurityIdentity securityIdentity;

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(summary = "Upload a document", description = "Uploads a document file, persists it, and starts async analysis. Returns immediately with the document ID.")
    @APIResponse(responseCode = "201", description = "Document created successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = DocumentResponse.class)))
    @APIResponse(responseCode = "400", description = "Invalid input")
    @APIResponse(responseCode = "401", description = "Not authenticated")
    public Response uploadDocument(
            @RestForm("file") FileUpload file) {
        // Validate input
        LOG.info("Upload request received - file: {}", file);
        if (file == null || file.fileName() == null || file.fileName().isBlank()) {
            LOG.warn("File validation failed: file={}, fileName={}", file, file != null ? file.fileName() : "null");
            throw new BadRequestException("File is required");
        }

        LOG.info("File details: name={}, contentType={}, size={}", file.fileName(), file.contentType(), file.size());
        if (!ALLOWED_CONTENT_TYPES.contains(file.contentType())) {
            LOG.warn("Unsupported content type: {}", file.contentType());
            throw new ClientErrorException(
                    "Unsupported file type: " + file.contentType() + ". Allowed: " + ALLOWED_CONTENT_TYPES,
                    Response.Status.UNSUPPORTED_MEDIA_TYPE);
        }

        // Get current organization
        Organization organization = organizationContext.getCurrentOrganization();
        if (organization == null) {
            throw new BadRequestException("User is not part of an organization");
        }

        // Create document entity
        Document document = new Document();
        document.setOrganization(organization);
        document.setAnalysisStatus(AnalysisStatus.PENDING);
        document.setUploadedBy(securityIdentity.getPrincipal().getName());

        // Upload file to S3 and set file metadata
        fileService.handleFileUpload(document, file);

        // Persist document
        documentRepository.persist(document);
        LOG.info("Document created: id={}, fileName={}", document.getId(), document.getFileName());

        // Fire event to trigger async analysis after transaction commits
        documentCreatedEvent.fire(new DocumentCreatedEvent(document.getId()));

        // Return response with 201 Created status
        DocumentResponse response = DocumentResponse.from(document);
        return Response.status(Response.Status.CREATED).entity(response).build();
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "List all documents", description = "Returns all documents for the current organization")
    @APIResponse(responseCode = "200", description = "List of documents", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = DocumentResponse[].class)))
    public List<DocumentResponse> listDocuments(
            @QueryParam("bommelId") @Parameter(description = "Filter by bommel ID") Long bommelId) {
        List<Document> documents;
        if (bommelId != null) {
            documents = documentRepository.findByBommelId(bommelId);
        } else {
            documents = documentRepository.findAllOrderedByDate();
        }

        return documents.stream()
                .map(DocumentResponse::from)
                .toList();
    }

    @GET
    @Path("/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Get a document", description = "Returns a document by ID including its analysis status and results")
    @APIResponse(responseCode = "200", description = "Document found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = DocumentResponse.class)))
    @APIResponse(responseCode = "404", description = "Document not found")
    public DocumentResponse getDocument(
            @PathParam("id") @Parameter(description = "Document ID") Long id) {
        Document document = documentRepository.findByIdScoped(id);
        if (document == null) {
            throw new NotFoundException("Document not found");
        }

        return DocumentResponse.from(document);
    }

    @PATCH
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(summary = "Update a document", description = "Updates a document with user-provided data. Sets extraction source to MANUAL if fields are modified.")
    @APIResponse(responseCode = "200", description = "Document updated", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = DocumentResponse.class)))
    @APIResponse(responseCode = "404", description = "Document not found")
    public DocumentResponse updateDocument(
            @PathParam("id") @Parameter(description = "Document ID") Long id,
            DocumentUpdateRequest request) {
        Document document = documentRepository.findByIdScoped(id);
        if (document == null) {
            throw new NotFoundException("Document not found");
        }

        // Track if any fields were manually modified
        boolean modified = false;

        // Update fields if provided
        if (request.name() != null) {
            document.setName(request.name());
            modified = true;
        }

        if (request.total() != null) {
            document.setTotal(request.total());
            modified = true;
        }

        if (request.totalTax() != null) {
            document.setTotalTax(request.totalTax());
            modified = true;
        }

        if (request.currencyCode() != null) {
            document.setCurrencyCode(request.currencyCode());
            modified = true;
        }

        if (request.transactionDate() != null && !request.transactionDate().isBlank()) {
            LocalDate date = LocalDate.parse(request.transactionDate());
            document.setTransactionTime(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
            modified = true;
        }

        if (request.bommelId() != null) {
            if (request.bommelId() > 0) {
                Bommel bommel = bommelRepository.findById(request.bommelId());
                if (bommel != null) {
                    document.setBommel(bommel);
                }
            } else {
                document.setBommel(null);
            }
        }

        // Update sender information
        if (request.senderName() != null && !request.senderName().isBlank()) {
            TradeParty sender = document.getSender();
            if (sender == null) {
                sender = new TradeParty();
                sender.setOrganization(document.getOrganization());
                document.setSender(sender);
            }
            sender.setName(request.senderName());
            sender.setStreet(request.senderStreet());
            sender.setZipCode(request.senderZipCode());
            sender.setCity(request.senderCity());
            modified = true;
        }

        document.setPrivatelyPaid(request.privatelyPaid());

        // Update tags if provided
        if (request.tags() != null) {
            updateDocumentTags(document, request.tags());
            modified = true;
        }

        // Mark as manually edited if modified
        if (modified) {
            document.setExtractionSource(ExtractionSource.MANUAL);
        }

        LOG.info("Document updated: id={}", document.getId());
        return DocumentResponse.from(document);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Delete a document", description = "Deletes a document and its associated file from storage")
    @APIResponse(responseCode = "204", description = "Document deleted")
    @APIResponse(responseCode = "404", description = "Document not found")
    public void deleteDocument(
            @PathParam("id") @Parameter(description = "Document ID") Long id) {
        Document document = documentRepository.findByIdScoped(id);
        if (document == null) {
            throw new NotFoundException("Document not found");
        }

        // Delete file from storage
        if (document.hasFile()) {
            fileService.deleteFile(document.getFileKey());
        }

        documentRepository.delete(document);
        LOG.info("Document deleted: id={}", id);
    }

    @GET
    @Path("/{id}/file")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    @Operation(summary = "Download document file", description = "Downloads the document file from storage")
    @APIResponse(responseCode = "200", description = "File content")
    @APIResponse(responseCode = "404", description = "Document or file not found")
    public Response downloadFile(
            @PathParam("id") @Parameter(description = "Document ID") Long id) {
        Document document = documentRepository.findByIdScoped(id);
        if (document == null || !document.hasFile()) {
            throw new NotFoundException("Document or file not found");
        }

        var inputStream = fileService.downloadFile(document.getFileKey());
        return Response.ok(inputStream)
                .header("Content-Disposition", "attachment; filename=\"" + document.getFileName() + "\"")
                .header("Content-Type", document.getFileContentType())
                .build();
    }

    @POST
    @Path("/{id}/reanalyze")
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(summary = "Re-analyze a document", description = "Triggers a new analysis for an existing document")
    @APIResponse(responseCode = "200", description = "Analysis started", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = DocumentResponse.class)))
    @APIResponse(responseCode = "404", description = "Document not found")
    @APIResponse(responseCode = "400", description = "Document has no file to analyze")
    public DocumentResponse reanalyzeDocument(
            @PathParam("id") @Parameter(description = "Document ID") Long id) {
        Document document = documentRepository.findByIdScoped(id);
        if (document == null) {
            throw new NotFoundException("Document not found");
        }

        if (!document.hasFile()) {
            throw new BadRequestException("Document has no file to analyze");
        }

        // Reset analysis status
        document.setAnalysisStatus(AnalysisStatus.PENDING);
        document.setAnalysisError(null);

        // Fire event to trigger async analysis after transaction commits
        documentCreatedEvent.fire(new DocumentCreatedEvent(document.getId()));

        LOG.info("Re-analysis triggered: id={}", id);
        return DocumentResponse.from(document);
    }

    /**
     * Updates document tags from a list of tag names.
     */
    private void updateDocumentTags(Document document, List<String> tagNames) {
        // Clear existing manual tags
        document.getDocumentTags().removeIf(dt -> dt.getSource() == TagSource.MANUAL);

        // Add new tags
        for (String tagName : tagNames) {
            if (tagName != null && !tagName.isBlank()) {
                // Create or find tag
                app.hopps.shared.domain.Tag tag = new app.hopps.shared.domain.Tag();
                tag.setName(tagName.trim());
                tag.setOrganization(document.getOrganization());
                document.addTag(tag, TagSource.MANUAL);
            }
        }
    }
}
