package app.hopps.document.workflow;

import java.io.InputStream;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.Set;

import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.document.client.DocumentData;
import app.hopps.document.client.TradePartyData;
import app.hopps.document.client.ZugFerdClient;
import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.ExtractionSource;
import app.hopps.document.domain.TagSource;
import app.hopps.document.domain.TradeParty;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.StorageService;
import app.hopps.shared.domain.Tag;
import app.hopps.shared.repository.TagRepository;
import app.hopps.workflow.WorkflowInstance;
import app.hopps.workflow.SystemTask;
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
	TagRepository tagRepository;

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

		LOG.info("Starting ZugFerd analysis: id={}, fileName={}",
			documentId, document.getFileName());

		try (InputStream fileStream = storageService.downloadFile(document.getFileKey()))
		{
			LOG.debug("Downloaded file from S3: key={}", document.getFileKey());

			analyzeDocument(document, fileStream);

			document.setAnalysisStatus(AnalysisStatus.COMPLETED);
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

		int fieldsUpdated = 0;

		if (data.total() != null
			&& (document.getTotal() == null || java.math.BigDecimal.ZERO.compareTo(document.getTotal()) == 0))
		{
			document.setTotal(data.total());
			LOG.debug("Autofilled total: {}", data.total());
			fieldsUpdated++;
		}

		if (data.currencyCode() != null && document.getCurrencyCode() == null)
		{
			document.setCurrencyCode(data.currencyCode());
			LOG.debug("Autofilled currencyCode: {}", data.currencyCode());
			fieldsUpdated++;
		}

		if (data.documentId() != null && document.getInvoiceId() == null)
		{
			document.setInvoiceId(data.documentId());
			LOG.debug("Autofilled invoiceId: {}", data.documentId());
			fieldsUpdated++;
		}

		if (data.purchaseOrderNumber() != null && document.getOrderNumber() == null)
		{
			document.setOrderNumber(data.purchaseOrderNumber());
			LOG.debug("Autofilled orderNumber: {}", data.purchaseOrderNumber());
			fieldsUpdated++;
		}

		if (data.date() != null && document.getTransactionTime() == null)
		{
			LocalTime time = data.time() != null ? data.time() : LocalTime.MIDNIGHT;
			document.setTransactionTime(data.date()
				.atTime(time)
				.atZone(ZoneId.systemDefault())
				.toInstant());
			LOG.debug("Autofilled transactionTime: {} {}", data.date(), time);
			fieldsUpdated++;
		}

		if (data.dueDate() != null && document.getDueDate() == null)
		{
			document.setDueDate(data.dueDate()
				.atStartOfDay(ZoneId.systemDefault()).toInstant());
			LOG.debug("Autofilled dueDate: {}", data.dueDate());
			fieldsUpdated++;
		}

		if (data.totalTax() != null && document.getTotalTax() == null)
		{
			document.setTotalTax(data.totalTax());
			LOG.debug("Autofilled totalTax: {}", data.totalTax());
			fieldsUpdated++;
		}

		if (data.merchantAddress() != null && document.getSender() == null)
		{
			TradeParty sender = mapTradeParty(data.merchantAddress());
			if (data.merchantName() != null)
			{
				sender.setName(data.merchantName());
			}
			document.setSender(sender);
			LOG.debug("Autofilled sender: {}", sender.getName());
			fieldsUpdated++;
		}
		else if (data.merchantName() != null && document.getSender() == null)
		{
			TradeParty sender = new TradeParty();
			sender.setName(data.merchantName());
			document.setSender(sender);
			LOG.debug("Autofilled sender name: {}", data.merchantName());
			fieldsUpdated++;
		}

		// Use merchant name or customer name as document name if not set
		if (document.getName() == null)
		{
			if (data.merchantName() != null)
			{
				document.setName(data.merchantName());
				LOG.debug("Autofilled name from merchant: {}", data.merchantName());
				fieldsUpdated++;
			}
			else if (data.customerName() != null)
			{
				document.setName(data.customerName());
				LOG.debug("Autofilled name from customer: {}", data.customerName());
				fieldsUpdated++;
			}
		}

		// Apply tags if document has no existing tags (ZugFerd doesn't provide
		// AI tags,
		// but the service might return tags in the future)
		if (data.tags() != null && !data.tags().isEmpty() && document.getDocumentTags().isEmpty())
		{
			Set<Tag> tags = tagRepository.findOrCreateTags(new HashSet<>(data.tags()));
			for (Tag tag : tags)
			{
				document.addTag(tag, TagSource.AI);
			}
			LOG.info("Applied {} tags from ZugFerd: {}", tags.size(), data.tags());
			fieldsUpdated++;
		}

		LOG.info("ZugFerd analysis complete: documentId={}, fieldsUpdated={}", document.getId(), fieldsUpdated);
	}

	private TradeParty mapTradeParty(TradePartyData data)
	{
		if (data == null)
		{
			return null;
		}

		TradeParty party = new TradeParty();
		party.setName(data.name());
		party.setStreet(data.street());
		party.setZipCode(data.postalCode());
		party.setCity(data.city());
		return party;
	}
}
