package app.fuggs.document.workflow;

import java.io.InputStream;

import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.fuggs.document.client.DocumentAiClient;
import app.fuggs.document.client.DocumentData;
import app.fuggs.document.domain.AnalysisStatus;
import app.fuggs.document.domain.Document;
import app.fuggs.document.domain.DocumentStatus;
import app.fuggs.document.domain.ExtractionSource;
import app.fuggs.document.domain.TagSource;
import app.fuggs.document.repository.DocumentRepository;
import app.fuggs.document.service.DocumentDataApplier;
import app.fuggs.document.service.StorageService;
import app.fuggs.workflow.WorkflowInstance;
import app.fuggs.workflow.SystemTask;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Analyzes an uploaded document using the Document AI service and updates the
 * document's metadata with extracted values. This task is used as a fallback
 * when ZugFerd extraction is not available or fails.
 */
@ApplicationScoped
public class AnalyzeDocumentAiTask extends SystemTask
{
	private static final Logger LOG = LoggerFactory.getLogger(AnalyzeDocumentAiTask.class);

	public static final String VAR_DOCUMENT_ID = "documentId";

	@Inject
	StorageService storageService;

	@Inject
	DocumentRepository documentRepository;

	@Inject
	DocumentDataApplier documentDataApplier;

	@RestClient
	DocumentAiClient documentAiClient;

	@Override
	public String getTaskName()
	{
		return "AnalyzeDocumentAi";
	}

	@Override
	@Transactional
	protected void doExecute(WorkflowInstance instance)
	{
		// Skip if ZugFerd already succeeded
		Boolean zugferdSuccess = instance.getVariable(AnalyzeDocumentZugFerdTask.VAR_ZUGFERD_SUCCESS, Boolean.class);
		if (Boolean.TRUE.equals(zugferdSuccess))
		{
			LOG.info("ZugFerd extraction succeeded, skipping AI analysis");
			return;
		}

		Long documentId = instance.getVariable(VAR_DOCUMENT_ID, Long.class);
		if (documentId == null)
		{
			LOG.error("Document ID not set in chain: {}", instance.getId());
			throw new IllegalStateException("Document ID not set in chain");
		}

		LOG.debug("Loading document: id={}", documentId);
		Document document = documentRepository.findById(documentId);
		if (document == null)
		{
			LOG.error("Document not found: id={}", documentId);
			throw new IllegalStateException("Document not found: " + documentId);
		}

		if (!document.hasFile())
		{
			LOG.info("Document has no file, skipping analysis: id={}", documentId);
			document.setAnalysisStatus(AnalysisStatus.SKIPPED);
			document.setDocumentStatus(DocumentStatus.UPLOADED);
			return;
		}

		// Mark as analyzing (if not already set by ZugFerd task)
		document.setAnalysisStatus(AnalysisStatus.ANALYZING);
		if (document.getDocumentStatus() != DocumentStatus.ANALYZING)
		{
			document.setDocumentStatus(DocumentStatus.ANALYZING);
		}

		LOG.info("Starting document analysis: id={}, fileName={}",
			documentId, document.getFileName());

		try (InputStream fileStream = storageService.downloadFile(document.getFileKey()))
		{
			LOG.debug("Downloaded file from S3: key={}", document.getFileKey());

			analyzeDocument(document, fileStream);

			document.setAnalysisStatus(AnalysisStatus.COMPLETED);
			document.setDocumentStatus(DocumentStatus.ANALYZED);
			document.setExtractionSource(ExtractionSource.AI);
			LOG.info("Document analysis completed successfully: id={}", documentId);
		}
		catch (Exception e)
		{
			LOG.error("Document analysis failed: id={}, error={}", documentId, e.getMessage(), e);
			document.setAnalysisStatus(AnalysisStatus.FAILED);
			document.setDocumentStatus(DocumentStatus.FAILED);
			document.setAnalysisError(e.getMessage());
			throw new RuntimeException("Document analysis failed: " + e.getMessage(), e);
		}
	}

	private void analyzeDocument(Document document, InputStream fileStream)
	{
		LOG.debug("Calling Document AI for analysis: documentId={}", document.getId());

		DocumentData data = documentAiClient.scanDocument(fileStream, document.getId());

		if (data == null)
		{
			LOG.warn("Document AI returned no data: documentId={}", document.getId());
			return;
		}

		LOG.debug("Received document data from AI: total={}, currency={}, documentId={}",
			data.total(), data.currencyCode(), data.documentId());

		// Apply the extracted data to the document using the shared applier
		// service
		documentDataApplier.applyDocumentData(document, data, TagSource.AI);
	}
}
