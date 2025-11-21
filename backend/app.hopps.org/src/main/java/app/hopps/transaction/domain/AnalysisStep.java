package app.hopps.transaction.domain;

/**
 * Individual steps in the document analysis pipeline.
 */
public enum AnalysisStep {
    /**
     * Attempt to extract ZugFerd e-invoice data from PDF.
     */
    ZUGFERD_EXTRACTION,

    /**
     * Extract document data using Azure Document Intelligence.
     */
    AZURE_EXTRACTION,

    /**
     * Generate semantic tags using AI/LLM.
     */
    TAGGING
}
