package app.hopps.document.service;

import app.hopps.document.audit.DocumentAuditor;
import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentChangedEvent;
import app.hopps.document.domain.DocumentCreatedEvent;
import app.hopps.document.domain.DocumentDirection;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.organization.domain.Organization;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;

/**
 * Creates a document from an uploaded file: stores the file, persists the document and starts the analysis. Shared by
 * the in-app upload and the public upload link, so both run through the same flow.
 */
@ApplicationScoped
public class DocumentUploadService {
    private static final Logger LOG = LoggerFactory.getLogger(DocumentUploadService.class);

    public static final List<String> ALLOWED_CONTENT_TYPES = List.of(
            "image/png", "image/jpeg", "application/pdf");

    private static final byte[] PNG_MAGIC = { (byte) 0x89, 'P', 'N', 'G' };
    private static final byte[] JPEG_MAGIC = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF };
    private static final byte[] PDF_MAGIC = { '%', 'P', 'D', 'F' };

    @Inject
    DocumentRepository documentRepository;

    @Inject
    DocumentFileService fileService;

    @Inject
    DocumentAuditor documentAuditor;

    @Inject
    Event<DocumentCreatedEvent> documentCreatedEvent;

    @Inject
    Event<DocumentChangedEvent> documentChangedEvent;

    /**
     * @throws BadRequestException
     *             if no file was sent
     * @throws ClientErrorException
     *             (415) if the declared content type is not an allowed receipt type
     */
    public static void validateFile(FileUpload file) {
        if (file == null || file.fileName() == null || file.fileName().isBlank()) {
            LOG.warn("File validation failed: file={}, fileName={}", file, file != null ? file.fileName() : "null");
            throw new BadRequestException("File is required");
        }
        if (!ALLOWED_CONTENT_TYPES.contains(file.contentType())) {
            LOG.warn("Unsupported content type: {}", file.contentType());
            throw new ClientErrorException(
                    "Unsupported file type: " + file.contentType() + ". Allowed: " + ALLOWED_CONTENT_TYPES,
                    Response.Status.UNSUPPORTED_MEDIA_TYPE);
        }
    }

    /**
     * Like {@link #validateFile}, but also checks that the file content starts with the signature of its declared type.
     * Used where the sender is not signed in, so the declared content type alone is not trusted.
     */
    public static void validateFileContent(FileUpload file) {
        validateFile(file);
        byte[] expected = switch (file.contentType()) {
            case "image/png" -> PNG_MAGIC;
            case "image/jpeg" -> JPEG_MAGIC;
            default -> PDF_MAGIC;
        };
        byte[] head;
        try (InputStream in = Files.newInputStream(file.uploadedFile())) {
            head = in.readNBytes(expected.length);
        } catch (IOException e) {
            throw new BadRequestException("File could not be read", e);
        }
        if (!Arrays.equals(head, expected)) {
            LOG.warn("File content does not match its content type: {}", file.contentType());
            throw new ClientErrorException("File content does not match " + file.contentType(),
                    Response.Status.UNSUPPORTED_MEDIA_TYPE);
        }
    }

    /**
     * Stores the file and persists a new document for it, then starts the analysis once the transaction commits.
     *
     * @param prepare
     *            sets further fields (bommel, channel, ...) before the document is persisted
     *
     * @throws ClientErrorException
     *             (409) if the organization already has a document with identical content
     */
    @Transactional
    public Document upload(Organization organization, FileUpload file, String uploadedBy, DocumentDirection direction,
            boolean analyze, Consumer<Document> prepare) {
        Document document = new Document();
        document.setOrganization(organization);
        document.setAnalysisStatus(AnalysisStatus.PENDING);
        document.setUploadedBy(uploadedBy);
        document.setDirection(direction != null ? direction : DocumentDirection.INCOMING);
        prepare.accept(document);

        // Upload file to S3 and set file metadata
        fileService.handleFileUpload(document, file);

        // Persist document. Flush so the @CreationTimestamp/@UpdateTimestamp values are populated before the response.
        document.setDocumentStatus(DocumentStatus.UPLOADED);
        documentRepository.persistAndFlush(document);
        documentAuditor.created(document);
        LOG.info("Document created: id={}, fileName={}, channel={}", document.getId(), document.getFileName(),
                document.getUploadChannel());

        // Fire event to trigger async analysis after transaction commits (only if requested)
        if (analyze) {
            documentCreatedEvent.fire(new DocumentCreatedEvent(document.getId()));
        } else {
            document.setAnalysisStatus(AnalysisStatus.SKIPPED);
            LOG.info("Skipping analysis for document: id={} (analyze=false)", document.getId());
        }

        documentChangedEvent.fire(new DocumentChangedEvent(document.getId(), organization.getId()));
        return document;
    }
}
