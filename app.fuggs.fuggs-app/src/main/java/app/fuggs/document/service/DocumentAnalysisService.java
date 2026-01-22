package app.fuggs.document.service;

import app.fuggs.document.domain.AnalysisStatus;
import app.fuggs.document.domain.Document;
import app.fuggs.document.workflow.DocumentProcessingWorkflow;
import app.fuggs.workflow.WorkflowInstance;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.slf4j.Logger;

import static org.slf4j.LoggerFactory.getLogger;

@ApplicationScoped
public class DocumentAnalysisService
{
	private static final Logger LOG = getLogger(DocumentAnalysisService.class);

	@Inject
	DocumentProcessingWorkflow documentProcessingWorkflow;

	/**
	 * Triggers AI document analysis workflow.
	 *
	 * @param document
	 *            the document to analyze
	 * @param analyzedBy
	 *            the username of the person triggering the analysis
	 * @return true if analysis was successfully started, false if AI service is
	 *         unavailable
	 */
	public boolean triggerAnalysis(Document document, String analyzedBy)
	{
		try
		{
			WorkflowInstance instance = documentProcessingWorkflow.startProcessing(document.getId());
			document.setWorkflowInstanceId(instance.getId());
			document.setAnalyzedBy(analyzedBy);
			LOG.info("Document processing workflow triggered: documentId={}, workflowInstanceId={}", document.getId(), instance.getId());
			return true;
		}
		catch (Exception e)
		{
			LOG.warn("Document analysis could not be started: documentId={}", document.getId(), e);

			// Don't fail the upload if analysis fails - it's an enhancement,
			// not critical
			return false;
		}
	}

	/**
	 * Marks a document as failed analysis with an error message.
	 *
	 * @param document
	 *            the document
	 * @param errorMessage
	 *            the error message to display to the user
	 */
	public void markAnalysisFailed(Document document, String errorMessage)
	{
		document.setAnalysisStatus(AnalysisStatus.FAILED);
		document.setAnalysisError(errorMessage);
		LOG.warn("Document analysis marked as failed: documentId={}, error={}", document.getId(), errorMessage);
	}
}
