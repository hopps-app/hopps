package app.hopps.bankimport.api.dto;

import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankTransactionStatus;
import app.hopps.bankimport.domain.BankImportStatus;

import java.time.Instant;
import java.util.Map;

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
        String failureReason,
        int totalTransactions,
        int matchedTransactions,
        int ignoredTransactions) {

    public static BankImportResponse from(BankImport job) {
        return from(job, Map.of());
    }

    public static BankImportResponse from(BankImport job, Map<BankTransactionStatus, Long> statusCounts) {
        long total = statusCounts.values().stream().mapToLong(Long::longValue).sum();
        long matched = statusCounts.getOrDefault(BankTransactionStatus.FULLY_MATCHED, 0L)
                + statusCounts.getOrDefault(BankTransactionStatus.PARTIALLY_MATCHED, 0L);
        long ignored = statusCounts.getOrDefault(BankTransactionStatus.IGNORED, 0L);
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
                job.getFailureReason(),
                (int) total,
                (int) matched,
                (int) ignored);
    }
}
