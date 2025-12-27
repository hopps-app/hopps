package app.hopps.document.workflow;

import java.io.InputStream;

import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.document.client.DocumentAiClient;
import app.hopps.document.client.DocumentData;
import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.ExtractionSource;
import app.hopps.document.domain.TagSource;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.DocumentDataApplier;
import app.hopps.document.service.StorageService;
import app.hopps.workflow.WorkflowInstance;
import app.hopps.workflow.SystemTask;
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
			return;
		}

		// Mark as analyzing
		document.setAnalysisStatus(AnalysisStatus.ANALYZING);

		LOG.info("Starting document analysis: id={}, type={}, fileName={}",
			documentId, document.getDocumentType(), document.getFileName());

		try (InputStream fileStream = storageService.downloadFile(document.getFileKey()))
		{
			LOG.debug("Downloaded file from S3: key={}", document.getFileKey());

			analyzeDocument(document, fileStream);

			document.setAnalysisStatus(AnalysisStatus.COMPLETED);
			document.setExtractionSource(ExtractionSource.AI);
			LOG.info("Document analysis completed successfully: id={}", documentId);
		}
		catch (Exception e)
		{
			LOG.error("Document analysis failed: id={}, error={}", documentId, e.getMessage(), e);
			document.setAnalysisStatus(AnalysisStatus.FAILED);
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
