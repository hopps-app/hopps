package app.hopps.bankimport.api.dto;

import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankImportStatus;

import java.time.Instant;

/**
 * Status DTO for an import job. Returned by the polling status endpoint and the import history list.
 */
public record BankImportResponse(
        Long id,
        Long bankAccountId,
        Long schemaId,
        String fileName,
        long fileSize,
        String fileSha256,
        String s3FileKey,
        String importedBy,
        Instant importedAt,
        Instant startedAt,
        Instant finishedAt,
        BankImportStatus status,
        int progress,
        int totalRows,
        int importedRows,
        int duplicateRows,
        int errorRows,
        String errorReport,
        String failureReason) {

    public static BankImportResponse from(BankImport job) {
        return new BankImportResponse(
                job.getId(),
                job.getBankAccount() != null ? job.getBankAccount().getId() : null,
                job.getSchema() != null ? job.getSchema().getId() : null,
                job.getFileName(),
                job.getFileSize(),
                job.getFileSha256(),
                job.getS3FileKey(),
                job.getImportedBy(),
                job.getImportedAt(),
                job.getStartedAt(),
                job.getFinishedAt(),
                job.getStatus(),
                job.getProgress(),
                job.getTotalRows(),
                job.getImportedRows(),
                job.getDuplicateRows(),
                job.getErrorRows(),
                job.getErrorReport(),
                job.getFailureReason());
    }
}
