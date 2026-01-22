package app.fuggs.document.workflow;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.fuggs.workflow.WorkflowInstance;
import app.fuggs.workflow.ProcessDefinition;
import app.fuggs.workflow.ProcessEngine;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Manages the complete document processing workflow. This workflow handles
 * document upload, analysis (ZugFerd extraction first, then AI fallback), and
 * user review/confirmation.
 */
@ApplicationScoped
public class DocumentProcessingWorkflow
{
	private static final Logger LOG = LoggerFactory.getLogger(DocumentProcessingWorkflow.class);

	public static final String PROCESS_NAME = "DocumentProcessing";

	@Inject
	ProcessEngine processEngine;

	@Inject
	AnalyzeDocumentZugFerdTask analyzeDocumentZugFerdTask;

	@Inject
	AnalyzeDocumentAiTask analyzeDocumentAiTask;

	@Inject
	ReviewDocumentTask reviewDocumentTask;

	/**
	 * Starts the document processing workflow for the given document. The
	 * workflow will analyze the document (ZugFerd first, then AI), then pause
	 * at a UserTask waiting for the user to review and confirm the data.
	 *
	 * @param documentId
	 *            the ID of the document to process
	 * @return the workflow instance
	 */
	public WorkflowInstance startProcessing(Long documentId)
	{
		LOG.info("Starting document processing workflow: documentId={}", documentId);
		LOG.debug("Creating process definition with ZugFerd, AI, and Review tasks");

		// ZugFerd task runs first - if it succeeds, AI task will skip
		// If ZugFerd fails or document is not PDF, AI task will process
		// After analysis, ReviewDocumentTask pauses workflow for user
		// confirmation
		ProcessDefinition process = new ProcessDefinition(PROCESS_NAME)
			.addTask(analyzeDocumentZugFerdTask)
			.addTask(analyzeDocumentAiTask)
			.addTask(reviewDocumentTask);

		Map<String, Object> variables = Map.of(
			AnalyzeDocumentZugFerdTask.VAR_DOCUMENT_ID, documentId);

		LOG.debug("Starting process with variables: {}", variables);
		WorkflowInstance instance = processEngine.startProcess(process, variables);

		if (instance.getError() != null)
		{
			LOG.warn("Document processing workflow failed: documentId={}, workflowInstanceId={}, error={}",
				documentId, instance.getId(), instance.getError());
		}
		else if (instance.isWaitingForUser())
		{
			LOG.info(
				"Document processing workflow paused for review: documentId={}, workflowInstanceId={}, status={}",
				documentId, instance.getId(), instance.getStatus());
		}
		else
		{
			LOG.info("Document processing workflow completed: documentId={}, workflowInstanceId={}, status={}",
				documentId, instance.getId(), instance.getStatus());
		}

		return instance;
	}
}
