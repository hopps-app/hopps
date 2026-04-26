package app.hopps.bankimport.domain;

import app.hopps.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Audit and async job record for a single CSV import. Created in QUEUED state when the user uploads a file; a
 * background worker picks it up and transitions through the lifecycle (see {@link BankImportStatus}).
 */
@Entity
@Table(name = "BankImport")
public class BankImport extends PanacheEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "bankaccount_id", nullable = false)
    private BankAccount bankAccount;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "schema_id", nullable = false)
    private BankCsvSchema schema;

    @Column(name = "filename", nullable = false)
    private String fileName;

    @Column(name = "filesize", nullable = false)
    private long fileSize;

    @Column(name = "filesha256", nullable = false, length = 64)
    private String fileSha256;

    @Column(name = "s3filekey", length = 512)
    private String s3FileKey;

    @Column(name = "importedby", nullable = false, updatable = false)
    private String importedBy;

    @Column(name = "importedat", nullable = false, updatable = false)
    private Instant importedAt;

    @Column(name = "startedat")
    private Instant startedAt;

    @Column(name = "finishedat")
    private Instant finishedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BankImportStatus status = BankImportStatus.QUEUED;

    @Column(nullable = false)
    private int progress = 0;

    @Column(name = "totalrows", nullable = false)
    private int totalRows = 0;

    @Column(name = "importedrows", nullable = false)
    private int importedRows = 0;

    @Column(name = "duplicaterows", nullable = false)
    private int duplicateRows = 0;

    @Column(name = "errorrows", nullable = false)
    private int errorRows = 0;

    @Column(name = "errorreport", columnDefinition = "text")
    private String errorReport;

    @Column(name = "failurereason", length = 512)
    private String failureReason;

    public BankImport() {
        this.importedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Organization getOrganization() {
        return organization;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    public BankAccount getBankAccount() {
        return bankAccount;
    }

    public void setBankAccount(BankAccount bankAccount) {
        this.bankAccount = bankAccount;
    }

    public BankCsvSchema getSchema() {
        return schema;
    }

    public void setSchema(BankCsvSchema schema) {
        this.schema = schema;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public long getFileSize() {
        return fileSize;
    }

    public void setFileSize(long fileSize) {
        this.fileSize = fileSize;
    }

    public String getFileSha256() {
        return fileSha256;
    }

    public void setFileSha256(String fileSha256) {
        this.fileSha256 = fileSha256;
    }

    public String getS3FileKey() {
        return s3FileKey;
    }

    public void setS3FileKey(String s3FileKey) {
        this.s3FileKey = s3FileKey;
    }

    public String getImportedBy() {
        return importedBy;
    }

    public void setImportedBy(String importedBy) {
        this.importedBy = importedBy;
    }

    public Instant getImportedAt() {
        return importedAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }

    public BankImportStatus getStatus() {
        return status;
    }

    public void setStatus(BankImportStatus status) {
        this.status = status;
    }

    public int getProgress() {
        return progress;
    }

    public void setProgress(int progress) {
        this.progress = progress;
    }

    public int getTotalRows() {
        return totalRows;
    }

    public void setTotalRows(int totalRows) {
        this.totalRows = totalRows;
    }

    public int getImportedRows() {
        return importedRows;
    }

    public void setImportedRows(int importedRows) {
        this.importedRows = importedRows;
    }

    public int getDuplicateRows() {
        return duplicateRows;
    }

    public void setDuplicateRows(int duplicateRows) {
        this.duplicateRows = duplicateRows;
    }

    public int getErrorRows() {
        return errorRows;
    }

    public void setErrorRows(int errorRows) {
        this.errorRows = errorRows;
    }

    public String getErrorReport() {
        return errorReport;
    }

    public void setErrorReport(String errorReport) {
        this.errorReport = errorReport;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }
}
