package app.hopps.document.workflow;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.simplepe.Chain;
import app.hopps.simplepe.ProcessDefinition;
import app.hopps.simplepe.ProcessEngine;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Manages the document analysis workflow. When a document is uploaded with a
 * file, this workflow triggers the AI analysis to extract and autofill
 * metadata.
 */
@ApplicationScoped
public class DocumentAnalysisWorkflow
{
	private static final Logger LOG = LoggerFactory.getLogger(DocumentAnalysisWorkflow.class);

	public static final String PROCESS_NAME = "DocumentAnalysis";

	@Inject
	ProcessEngine processEngine;

	@Inject
	AnalyzeDocumentTask analyzeDocumentTask;

	@Inject
	GenerateTagsTask generateTagsTask;

	/**
	 * Starts the document analysis workflow for the given document.
	 *
	 * @param documentId
	 *            the ID of the document to analyze
	 * @return the workflow chain
	 */
	public Chain startAnalysis(Long documentId)
	{
		LOG.info("Starting document analysis workflow: documentId={}", documentId);
		LOG.debug("Creating process definition with AnalyzeDocumentTask and GenerateTagsTask");

		ProcessDefinition process = new ProcessDefinition(PROCESS_NAME)
			.addTask(analyzeDocumentTask)
			.addTask(generateTagsTask);

		Map<String, Object> variables = Map.of(
			AnalyzeDocumentTask.VAR_DOCUMENT_ID, documentId);

		LOG.debug("Starting process with variables: {}", variables);
		Chain chain = processEngine.startProcess(process, variables);

		if (chain.getError() != null)
		{
			LOG.warn("Document analysis workflow failed: documentId={}, chainId={}, error={}",
				documentId, chain.getId(), chain.getError());
		}
		else
		{
			LOG.info("Document analysis workflow completed: documentId={}, chainId={}, status={}",
				documentId, chain.getId(), chain.getStatus());
		}

		return chain;
	}
}
