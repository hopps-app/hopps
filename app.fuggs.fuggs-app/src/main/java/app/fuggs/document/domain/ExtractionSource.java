package app.fuggs.document.domain;

/**
 * Indicates which method was used to extract document data.
 */
public enum ExtractionSource
{
	/**
	 * Data was extracted from embedded ZugFerd XML in the PDF.
	 */
	ZUGFERD,

	/**
	 * Data was extracted using Azure Document AI.
	 */
	AI,

	/**
	 * Data was entered manually by the user.
	 */
	MANUAL
}
