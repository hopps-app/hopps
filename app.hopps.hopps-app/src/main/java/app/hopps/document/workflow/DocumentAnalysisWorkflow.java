package app.hopps.document.workflow;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.workflow.WorkflowInstance;
import app.hopps.workflow.ProcessDefinition;
import app.hopps.workflow.ProcessEngine;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Manages the document analysis workflow. When a document is uploaded with a
 * file, this workflow triggers ZugFerd extraction first (for PDFs), then falls
 * back to AI analysis if ZugFerd fails or is not applicable.
 */
@ApplicationScoped
public class DocumentAnalysisWorkflow
{
	private static final Logger LOG = LoggerFactory.getLogger(DocumentAnalysisWorkflow.class);

	public static final String PROCESS_NAME = "DocumentAnalysis";

	@Inject
	ProcessEngine processEngine;

	@Inject
	AnalyzeDocumentZugFerdTask analyzeDocumentZugFerdTask;

	@Inject
	AnalyzeDocumentAiTask analyzeDocumentAiTask;

	/**
	 * Starts the document analysis workflow for the given document.
	 *
	 * @param documentId
	 *            the ID of the document to analyze
	 * @return the workflow chain
	 */
	public WorkflowInstance startAnalysis(Long documentId)
	{
		LOG.info("Starting document analysis workflow: documentId={}", documentId);
		LOG.debug("Creating process definition with ZugFerd and AI tasks");

		// ZugFerd task runs first - if it succeeds, AI task will skip
		// If ZugFerd fails or document is not PDF, AI task will process
		ProcessDefinition process = new ProcessDefinition(PROCESS_NAME)
			.addTask(analyzeDocumentZugFerdTask)
			.addTask(analyzeDocumentAiTask);

		Map<String, Object> variables = Map.of(
			AnalyzeDocumentZugFerdTask.VAR_DOCUMENT_ID, documentId);

		LOG.debug("Starting process with variables: {}", variables);
		WorkflowInstance instance = processEngine.startProcess(process, variables);

		if (instance.getError() != null)
		{
			LOG.warn("Document analysis workflow failed: documentId={}, workflowInstanceId={}, error={}",
				documentId, instance.getId(), instance.getError());
		}
		else
		{
			LOG.info("Document analysis workflow completed: documentId={}, workflowInstanceId={}, status={}",
				documentId, instance.getId(), instance.getStatus());
		}

		return instance;
	}
}
