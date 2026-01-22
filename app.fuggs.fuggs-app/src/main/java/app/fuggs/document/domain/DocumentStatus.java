package app.fuggs.document.domain;

/**
 * Represents the overall status of a document in its processing lifecycle. This
 * enum tracks the high-level workflow state, distinct from AnalysisStatus which
 * tracks internal analysis execution.
 */
public enum DocumentStatus
{
	/**
	 * Document has been uploaded with a file, but no analysis has been
	 * triggered yet.
	 */
	UPLOADED,

	/**
	 * Analysis is currently in progress (workflow is executing).
	 */
	ANALYZING,

	/**
	 * Analysis has completed successfully, awaiting user review and
	 * confirmation.
	 */
	ANALYZED,

	/**
	 * User has reviewed and confirmed the document data.
	 */
	CONFIRMED,

	/**
	 * Analysis or processing has failed.
	 */
	FAILED
}
