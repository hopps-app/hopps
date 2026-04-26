package app.hopps.bankimport.service;

import app.hopps.shared.infrastructure.storage.S3Handler;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.UUID;

/**
 * Wraps {@link S3Handler} with bank-import-specific key conventions. Original CSV files are archived for max 30 days
 * (DSGVO §6.5) under {@code bank-imports/{orgId}/{uuid}/{filename}}; the lifecycle rule that enforces the retention
 * window is configured at the S3 bucket level.
 */
@ApplicationScoped
public class ImportFileStorageService {

    @Inject
    S3Handler s3Handler;

    public String storeImportFile(Long organizationId, String fileName, byte[] content, String contentType) {
        String key = buildKey(organizationId, fileName);
        s3Handler.saveFile(key, contentType != null ? contentType : "text/csv", content);
        return key;
    }

    public byte[] readImportFile(String s3Key) {
        return s3Handler.getFile(s3Key);
    }

    private String buildKey(Long organizationId, String fileName) {
        String safeName = fileName == null ? "import.csv" : fileName.replaceAll("[^A-Za-z0-9._-]", "_");
        return "bank-imports/" + organizationId + "/" + UUID.randomUUID() + "/" + safeName;
    }
}
