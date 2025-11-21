package app.hopps.transaction.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Stores the result and metadata of document analysis for a transaction record.
 * This is separate from TransactionRecord to track analysis progress and preserve AI suggestions
 * even after user edits the transaction.
 */
@Entity
@Table(name = "transaction_record_analysis_result")
public class TransactionRecordAnalysisResult extends PanacheEntity {

    /**
     * Link to the transaction record being analyzed.
     */
    @OneToOne
    @JoinColumn(name = "transaction_record_id", nullable = false, unique = true)
    private TransactionRecord transactionRecord;

    /**
     * Overall status of the analysis.
     */
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private AnalysisStatus status = AnalysisStatus.QUEUED;

    /**
     * Extracted data from the document as JSON.
     * This preserves the AI suggestions even after user edits the transaction record.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extracted_data", columnDefinition = "jsonb")
    private Map<String, Object> extractedData = new HashMap<>();

    /**
     * Method used for extraction (ZUGFERD, AZURE, or MANUAL).
     */
    @Column(name = "extraction_method", length = 50)
    private String extractionMethod;

    /**
     * Confidence scores for each extracted field (0.0 to 1.0).
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "confidence_scores", columnDefinition = "jsonb")
    private Map<String, Double> confidenceScores = new HashMap<>();

    /**
     * Progress of each analysis step.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "analysis_step_progress", joinColumns = @JoinColumn(name = "analysis_result_id"))
    @MapKeyColumn(name = "step", length = 50)
    @MapKeyEnumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    @Enumerated(EnumType.STRING)
    private Map<AnalysisStep, StepStatus> stepProgress = new HashMap<>();

    /**
     * Error code if analysis failed.
     */
    @Column(name = "error_code", length = 100)
    private String errorCode;

    /**
     * Error message if analysis failed.
     */
    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    /**
     * Which step failed (if any).
     */
    @Column(name = "failed_step", length = 50)
    @Enumerated(EnumType.STRING)
    private AnalysisStep failedStep;

    /**
     * When the analysis started.
     */
    @Column(name = "started_at")
    private Instant startedAt;

    /**
     * When the analysis completed (successfully or with failure).
     */
    @Column(name = "completed_at")
    private Instant completedAt;

    // Constructors

    public TransactionRecordAnalysisResult() {
        // Default constructor for JPA
    }

    public TransactionRecordAnalysisResult(TransactionRecord transactionRecord) {
        this.transactionRecord = transactionRecord;
        this.status = AnalysisStatus.QUEUED;
    }

    // Getters and Setters

    public TransactionRecord getTransactionRecord() {
        return transactionRecord;
    }

    public void setTransactionRecord(TransactionRecord transactionRecord) {
        this.transactionRecord = transactionRecord;
    }

    public AnalysisStatus getStatus() {
        return status;
    }

    public void setStatus(AnalysisStatus status) {
        this.status = status;
    }

    public Map<String, Object> getExtractedData() {
        return extractedData;
    }

    public void setExtractedData(Map<String, Object> extractedData) {
        this.extractedData = extractedData;
    }

    public String getExtractionMethod() {
        return extractionMethod;
    }

    public void setExtractionMethod(String extractionMethod) {
        this.extractionMethod = extractionMethod;
    }

    public Map<String, Double> getConfidenceScores() {
        return confidenceScores;
    }

    public void setConfidenceScores(Map<String, Double> confidenceScores) {
        this.confidenceScores = confidenceScores;
    }

    public Map<AnalysisStep, StepStatus> getStepProgress() {
        return stepProgress;
    }

    public void setStepProgress(Map<AnalysisStep, StepStatus> stepProgress) {
        this.stepProgress = stepProgress;
    }

    public void updateStepProgress(AnalysisStep step, StepStatus status) {
        this.stepProgress.put(step, status);
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public AnalysisStep getFailedStep() {
        return failedStep;
    }

    public void setFailedStep(AnalysisStep failedStep) {
        this.failedStep = failedStep;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }
}
