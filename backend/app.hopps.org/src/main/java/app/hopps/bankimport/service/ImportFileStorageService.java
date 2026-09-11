package app.hopps.bankimport.service;

import app.hopps.shared.infrastructure.storage.FileStorage;
import app.hopps.shared.infrastructure.storage.StorageKeys;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.UUID;

/**
 * Wraps {@link FileStorage} with bank-import-specific key conventions. Original CSV files are archived for max 30 days
 * (DSGVO §6.5) under {@code bank-imports/{orgId}/{uuid}/{filename}}; the lifecycle rule that enforces the retention
 * window is configured at the storage level.
 */
@ApplicationScoped
public class ImportFileStorageService {

    private static final String DEFAULT_FILE_NAME = "import.csv";
    private static final String DEFAULT_CONTENT_TYPE = "text/csv";

    @Inject
    FileStorage fileStorage;

    public String storeImportFile(Long organizationId, String fileName, byte[] content, String contentType) {
        String key = buildKey(organizationId, fileName);
        fileStorage.put(key, content, contentType != null ? contentType : DEFAULT_CONTENT_TYPE);
        return key;
    }

    public byte[] readImportFile(String fileKey) {
        return fileStorage.getBytes(fileKey);
    }

    private String buildKey(Long organizationId, String fileName) {
        String safeName = StorageKeys.sanitizeFileName(fileName, DEFAULT_FILE_NAME);
        return "bank-imports/" + organizationId + "/" + UUID.randomUUID() + "/" + safeName;
    }
}
