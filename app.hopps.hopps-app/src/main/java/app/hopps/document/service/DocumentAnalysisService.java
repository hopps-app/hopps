package app.hopps.document.service;

import org.jboss.logging.Logger;

import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.Document;
import app.hopps.document.workflow.DocumentProcessingWorkflow;
import app.hopps.workflow.WorkflowInstance;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class DocumentAnalysisService
{
	private static final Logger LOG = Logger.getLogger(DocumentAnalysisService.class);

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
			LOG.infof("Document processing workflow triggered: documentId=%s, workflowInstanceId=%s",
				document.getId(), instance.getId());
			return true;
		}
		catch (Exception e)
		{
			LOG.warnf(e, "Document analysis could not be started: documentId=%s",
				document.getId());
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
		LOG.warnf("Document analysis marked as failed: documentId=%s, error=%s",
			document.getId(), errorMessage);
	}
}
