package app.hopps.document.service;

import app.hopps.bankimport.service.DedupeHashService;
import app.hopps.document.api.dto.DuplicateDocumentResponse;
import app.hopps.document.domain.Document;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.shared.infrastructure.storage.FileStorage;
import app.hopps.shared.infrastructure.storage.StorageKeys;
import app.hopps.shared.infrastructure.storage.StoredFile;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.slf4j.Logger;

import java.io.IOException;
import java.nio.file.Files;
import java.util.Objects;
import java.util.UUID;

import static org.slf4j.LoggerFactory.getLogger;

@ApplicationScoped
public class DocumentFileService {
    private static final Logger LOG = getLogger(DocumentFileService.class);

    private static final String DEFAULT_FILE_NAME = "document";

    @Inject
    FileStorage fileStorage;

    @Inject
    DocumentRepository documentRepository;

    /**
     * Handles file upload for a document: rejects duplicate content, stores the file and updates document metadata
     * (including the content hash).
     *
     * @param document
     *            the document to attach the file to
     * @param file
     *            the uploaded file
     *
     * @throws ClientErrorException
     *             (409 Conflict) if another document in the same organization already has identical content
     */
    public void handleFileUpload(Document document, FileUpload file) {
        byte[] bytes;
        try {
            bytes = Files.readAllBytes(file.uploadedFile());
        } catch (IOException e) {
            LOG.error("Failed to read uploaded file", e);
            throw new RuntimeException("Fehler beim Lesen der Datei", e);
        }

        // Reject re-uploads of a file that already exists in this organization. Comparing the document id lets a file
        // replacement keep its own identical content without tripping the check.
        String fileHash = DedupeHashService.sha256(bytes);
        Document existing = documentRepository.findByFileHash(fileHash);
        if (existing != null && !Objects.equals(existing.getId(), document.getId())) {
            // Return the existing document's id in the 409 body so the client can link straight to the already-booked
            // receipt.
            throw new ClientErrorException(Response.status(Response.Status.CONFLICT)
                    .entity(new DuplicateDocumentResponse(existing.getId(), "Dieser Beleg wurde bereits hochgeladen"))
                    .type(MediaType.APPLICATION_JSON)
                    .build());
        }

        String fileKey = "documents/" + UUID.randomUUID() + "/"
                + StorageKeys.sanitizeFileName(file.fileName(), DEFAULT_FILE_NAME);
        try {
            fileStorage.put(fileKey, bytes, file.contentType());
            LOG.info("File uploaded to storage: key={}, size={}", fileKey, file.size());

            document.setFileKey(fileKey);
            document.setFileName(file.fileName());
            document.setFileContentType(file.contentType());
            document.setFileSize(file.size());
            document.setFileHash(fileHash);
        } catch (Exception e) {
            LOG.error("Failed to upload file", e);
            throw new RuntimeException("Fehler beim Hochladen der Datei", e);
        }
    }

    /**
     * Deletes a file from storage.
     *
     * @param fileKey
     *            the storage key of the file to delete
     */
    public void deleteFile(String fileKey) {
        if (fileKey == null || fileKey.isBlank()) {
            return;
        }

        try {
            fileStorage.delete(fileKey);
            LOG.info("File deleted from storage: key={}", fileKey);
        } catch (Exception e) {
            LOG.warn("Failed to delete file from storage: key={}", fileKey, e);
            // Don't fail the operation if file deletion fails
        }
    }

    /**
     * Opens a file from storage. The caller owns the returned handle and must close it.
     *
     * @param fileKey
     *            the storage key of the file
     *
     * @return the open file
     *
     * @throws app.hopps.shared.infrastructure.storage.StoredFileNotFoundException
     *             if the file is no longer stored
     */
    public StoredFile downloadFile(String fileKey) {
        return fileStorage.get(fileKey);
    }
}
