package app.fuggs.document.workflow;

import java.io.InputStream;

import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.fuggs.document.client.DocumentData;
import app.fuggs.document.client.ZugFerdClient;
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
 * Analyzes an uploaded PDF document using the ZugFerd service to extract
 * embedded invoice data. This task only processes PDF files and sets a chain
 * variable to indicate success/failure for workflow orchestration.
 */
@ApplicationScoped
public class AnalyzeDocumentZugFerdTask extends SystemTask
{
	private static final Logger LOG = LoggerFactory.getLogger(AnalyzeDocumentZugFerdTask.class);

	public static final String VAR_DOCUMENT_ID = "documentId";
	public static final String VAR_ZUGFERD_SUCCESS = "zugferdSuccess";

	@Inject
	StorageService storageService;

	@Inject
	DocumentRepository documentRepository;

	@Inject
	DocumentDataApplier documentDataApplier;

	@RestClient
	ZugFerdClient zugFerdClient;

	@Override
	public String getTaskName()
	{
		return "AnalyzeDocumentZugFerd";
	}

	@Override
	@Transactional
	protected void doExecute(WorkflowInstance instance)
	{
		// Default to false - will be set to true only on successful extraction
		instance.setVariable(VAR_ZUGFERD_SUCCESS, false);

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
			LOG.info("Document has no file, skipping ZugFerd analysis: id={}", documentId);
			return;
		}

		// ZugFerd only works with PDF files
		if (!document.isPdf())
		{
			LOG.info("Document is not a PDF, skipping ZugFerd analysis: id={}, contentType={}",
				documentId, document.getFileContentType());
			return;
		}

		// Mark as analyzing
		document.setAnalysisStatus(AnalysisStatus.ANALYZING);
		document.setDocumentStatus(DocumentStatus.ANALYZING);

		LOG.info("Starting ZugFerd analysis: id={}, fileName={}",
			documentId, document.getFileName());

		try (InputStream fileStream = storageService.downloadFile(document.getFileKey()))
		{
			LOG.debug("Downloaded file from S3: key={}", document.getFileKey());

			analyzeDocument(document, fileStream);

			document.setAnalysisStatus(AnalysisStatus.COMPLETED);
			document.setDocumentStatus(DocumentStatus.ANALYZED);
			document.setExtractionSource(ExtractionSource.ZUGFERD);
			instance.setVariable(VAR_ZUGFERD_SUCCESS, true);
			LOG.info("ZugFerd analysis completed successfully: id={}", documentId);
		}
		catch (Exception e)
		{
			LOG.info("ZugFerd extraction failed (will fallback to AI): id={}, error={}",
				documentId, e.getMessage());
			// Reset status to PENDING so AI task can try
			document.setAnalysisStatus(AnalysisStatus.PENDING);
			// Keep documentStatus as ANALYZING - AI task will update it
			// Keep zugferdSuccess as false - AI task will be triggered
		}
	}

	private void analyzeDocument(Document document, InputStream fileStream)
	{
		LOG.debug("Calling ZugFerd service for analysis: documentId={}", document.getId());

		DocumentData data = zugFerdClient.scanDocument(fileStream, document.getId());

		if (data == null)
		{
			LOG.warn("ZugFerd service returned no data: documentId={}", document.getId());
			throw new RuntimeException("ZugFerd extraction returned no data");
		}

		LOG.debug("Received document data from ZugFerd: total={}, currency={}, documentId={}",
			data.total(), data.currencyCode(), data.documentId());

		// Apply the extracted data to the document using the shared applier
		// service
		documentDataApplier.applyDocumentData(document, data, TagSource.AI);
	}
}
