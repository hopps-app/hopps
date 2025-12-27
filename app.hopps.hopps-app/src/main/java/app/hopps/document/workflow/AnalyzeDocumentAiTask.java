package app.hopps.document.workflow;

import java.io.InputStream;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.Set;

import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.document.client.DocumentAiClient;
import app.hopps.document.client.DocumentData;
import app.hopps.document.client.TradePartyData;
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
	TagRepository tagRepository;

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

		// Apply AI-generated tags if document has no existing tags
		if (data.tags() != null && !data.tags().isEmpty() && document.getDocumentTags().isEmpty())
		{
			Set<Tag> tags = tagRepository.findOrCreateTags(new HashSet<>(data.tags()));
			for (Tag tag : tags)
			{
				document.addTag(tag, TagSource.AI);
			}
			LOG.info("Applied {} AI-generated tags: {}", tags.size(), data.tags());
			fieldsUpdated++;
		}

		LOG.info("Document analysis complete: documentId={}, fieldsUpdated={}", document.getId(), fieldsUpdated);
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
