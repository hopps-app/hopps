package app.hopps.document.workflow;

import java.io.InputStream;
import java.time.ZoneId;

import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.document.client.DocumentAiClient;
import app.hopps.document.client.InvoiceData;
import app.hopps.document.client.ReceiptData;
import app.hopps.document.client.TradePartyData;
import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.domain.TradeParty;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.StorageService;
import app.hopps.simplepe.Chain;
import app.hopps.simplepe.SystemTask;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Analyzes an uploaded document using the Document AI service and updates the
 * document's metadata with extracted values.
 */
@ApplicationScoped
public class AnalyzeDocumentTask extends SystemTask
{
	private static final Logger LOG = LoggerFactory.getLogger(AnalyzeDocumentTask.class);

	public static final String VAR_DOCUMENT_ID = "documentId";

	@Inject
	StorageService storageService;

	@Inject
	DocumentRepository documentRepository;

	@RestClient
	DocumentAiClient documentAiClient;

	@Override
	public String getTaskName()
	{
		return "AnalyzeDocument";
	}

	@Override
	@Transactional
	protected void doExecute(Chain chain)
	{
		Long documentId = chain.getVariable(VAR_DOCUMENT_ID, Long.class);
		if (documentId == null)
		{
			LOG.error("Document ID not set in chain: {}", chain.getId());
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

			if (document.getDocumentType() == DocumentType.INVOICE)
			{
				analyzeInvoice(document, fileStream);
			}
			else
			{
				analyzeReceipt(document, fileStream);
			}

			document.setAnalysisStatus(AnalysisStatus.COMPLETED);
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

	private void analyzeInvoice(Document document, InputStream fileStream)
	{
		LOG.debug("Calling Document AI for invoice analysis: documentId={}", document.getId());

		InvoiceData invoiceData = documentAiClient.scanInvoice(fileStream, document.getId());

		if (invoiceData == null)
		{
			LOG.warn("Document AI returned no data for invoice: documentId={}", document.getId());
			return;
		}

		LOG.debug("Received invoice data from AI: total={}, currency={}, invoiceId={}",
			invoiceData.total(), invoiceData.currencyCode(), invoiceData.invoiceId());

		int fieldsUpdated = 0;

		// Update document with extracted data
		if (invoiceData.total() != null && document.getTotal() == null)
		{
			document.setTotal(invoiceData.total());
			LOG.debug("Autofilled total: {}", invoiceData.total());
			fieldsUpdated++;
		}

		if (invoiceData.currencyCode() != null && document.getCurrencyCode() == null)
		{
			document.setCurrencyCode(invoiceData.currencyCode());
			LOG.debug("Autofilled currencyCode: {}", invoiceData.currencyCode());
			fieldsUpdated++;
		}

		if (invoiceData.invoiceId() != null && document.getInvoiceId() == null)
		{
			document.setInvoiceId(invoiceData.invoiceId());
			LOG.debug("Autofilled invoiceId: {}", invoiceData.invoiceId());
			fieldsUpdated++;
		}

		if (invoiceData.purchaseOrderNumber() != null && document.getOrderNumber() == null)
		{
			document.setOrderNumber(invoiceData.purchaseOrderNumber());
			LOG.debug("Autofilled orderNumber: {}", invoiceData.purchaseOrderNumber());
			fieldsUpdated++;
		}

		if (invoiceData.invoiceDate() != null && document.getTransactionTime() == null)
		{
			document.setTransactionTime(invoiceData.invoiceDate()
				.atStartOfDay(ZoneId.systemDefault()).toInstant());
			LOG.debug("Autofilled transactionTime: {}", invoiceData.invoiceDate());
			fieldsUpdated++;
		}

		if (invoiceData.dueDate() != null && document.getDueDate() == null)
		{
			document.setDueDate(invoiceData.dueDate()
				.atStartOfDay(ZoneId.systemDefault()).toInstant());
			LOG.debug("Autofilled dueDate: {}", invoiceData.dueDate());
			fieldsUpdated++;
		}

		if (invoiceData.sender() != null && document.getSender() == null)
		{
			document.setSender(mapTradeParty(invoiceData.sender()));
			LOG.debug("Autofilled sender: {}", invoiceData.sender().name());
			fieldsUpdated++;
		}

		// Use customer name as document name if not set
		if (invoiceData.customerName() != null && document.getName() == null)
		{
			document.setName(invoiceData.customerName());
			LOG.debug("Autofilled name: {}", invoiceData.customerName());
			fieldsUpdated++;
		}

		LOG.info("Invoice analysis complete: documentId={}, fieldsUpdated={}", document.getId(), fieldsUpdated);
	}

	private void analyzeReceipt(Document document, InputStream fileStream)
	{
		LOG.debug("Calling Document AI for receipt analysis: documentId={}", document.getId());

		ReceiptData receiptData = documentAiClient.scanReceipt(fileStream, document.getId());

		if (receiptData == null)
		{
			LOG.warn("Document AI returned no data for receipt: documentId={}", document.getId());
			return;
		}

		LOG.debug("Received receipt data from AI: total={}, storeName={}",
			receiptData.total(), receiptData.storeName());

		int fieldsUpdated = 0;

		// Update document with extracted data
		if (receiptData.total() != null && document.getTotal() == null)
		{
			document.setTotal(receiptData.total());
			LOG.debug("Autofilled total: {}", receiptData.total());
			fieldsUpdated++;
		}

		if (receiptData.transactionTime() != null && document.getTransactionTime() == null)
		{
			document.setTransactionTime(receiptData.transactionTime()
				.atZone(ZoneId.systemDefault()).toInstant());
			LOG.debug("Autofilled transactionTime: {}", receiptData.transactionTime());
			fieldsUpdated++;
		}

		if (receiptData.storeAddress() != null && document.getSender() == null)
		{
			document.setSender(mapTradeParty(receiptData.storeAddress()));
			LOG.debug("Autofilled sender from store address: {}", receiptData.storeAddress().name());
			fieldsUpdated++;
		}

		// Use store name as document name if not set
		if (receiptData.storeName() != null && document.getName() == null)
		{
			document.setName(receiptData.storeName());
			LOG.debug("Autofilled name: {}", receiptData.storeName());
			fieldsUpdated++;
		}

		LOG.info("Receipt analysis complete: documentId={}, fieldsUpdated={}", document.getId(), fieldsUpdated);
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
