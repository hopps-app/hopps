package app.hopps.document.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.document.domain.DocumentTag;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.domain.TagSource;
import app.hopps.document.domain.TradeParty;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.transaction.domain.TransactionRecord;
import app.hopps.transaction.repository.TransactionRecordRepository;
import app.hopps.document.service.StorageService;
import app.hopps.document.workflow.DocumentProcessingWorkflow;
import app.hopps.shared.domain.Tag;
import app.hopps.shared.repository.TagRepository;
import app.hopps.workflow.ProcessEngine;
import app.hopps.workflow.WorkflowInstance;
import io.quarkiverse.renarde.Controller;
import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.RestQuery;
import org.jboss.resteasy.reactive.multipart.FileUpload;

@Authenticated
@Path("/belege")
public class DocumentResource extends Controller
{
	private static final Logger LOG = LoggerFactory.getLogger(DocumentResource.class);

	@Inject
	DocumentRepository documentRepository;

	@Inject
	BommelRepository bommelRepository;

	@Inject
	TransactionRecordRepository transactionRepository;

	@Inject
	StorageService storageService;

	@Inject
	DocumentProcessingWorkflow documentProcessingWorkflow;

	@Inject
	ProcessEngine processEngine;

	@Inject
	TagRepository tagRepository;

	@Inject
	SecurityIdentity securityIdentity;

	@CheckedTemplate
	public static class Templates
	{
		public static native TemplateInstance index(List<Document> documents, List<Document> documentsNeedingReview);

		public static native TemplateInstance create();

		public static native TemplateInstance review(Document document, List<Bommel> bommels);

		public static native TemplateInstance show(Document document, List<Bommel> bommels);
	}

	@GET
	@Path("")
	public TemplateInstance index(@RestQuery Long bommelId)
	{
		List<Document> documents;
		if (bommelId != null)
		{
			documents = documentRepository.findByBommelId(bommelId);
		}
		else
		{
			documents = documentRepository.findAllOrderedByDate();
		}

		// Filter documents that need review (status = ANALYZED)
		List<Document> documentsNeedingReview = documents.stream()
			.filter(d -> d.getDocumentStatus() != null && d.getDocumentStatus() == DocumentStatus.ANALYZED)
			.toList();

		return Templates.index(documents, documentsNeedingReview);
	}

	@GET
	@Path("/neu")
	public TemplateInstance create()
	{
		return Templates.create();
	}

	@GET
	@Path("/{id}/pruefen")
	public TemplateInstance review(Long id)
	{
		Document document = documentRepository.findById(id);
		if (document == null)
		{
			flash("error", "Beleg nicht gefunden");
			redirect(DocumentResource.class).index(null);
			return null;
		}
		List<Bommel> bommels = bommelRepository.listAll();
		return Templates.review(document, bommels);
	}

	@GET
	@Path("/{id}/analysis-status")
	@Produces(MediaType.APPLICATION_JSON)
	public Response getAnalysisStatus(Long id)
	{
		Document document = documentRepository.findById(id);
		if (document == null)
		{
			return Response.status(Response.Status.NOT_FOUND).build();
		}

		String status = document.getAnalysisStatus() != null
			? document.getAnalysisStatus().name()
			: "PENDING";

		return Response.ok(new AnalysisStatusResponse(
			status,
			document.isAnalysisComplete(),
			document.getAnalysisError())).build();
	}

	public record AnalysisStatusResponse(String status, boolean complete, String error)
	{
	}

	@GET
	@Path("/{id}")
	public TemplateInstance show(Long id)
	{
		Document document = documentRepository.findById(id);
		if (document == null)
		{
			flash("error", "Beleg nicht gefunden");
			redirect(DocumentResource.class).index(null);
			return null;
		}
		List<Bommel> bommels = bommelRepository.listAll();
		return Templates.show(document, bommels);
	}

	/**
	 * Step 1: Upload file and create document (simplified - just file and type)
	 */
	@POST
	@Transactional
	@Path("/upload")
	public void upload(
		@RestForm @NotNull String documentType,
		@RestForm("file") FileUpload file)
	{
		if (validationFailed())
		{
			redirect(DocumentResource.class).create();
			return;
		}

		boolean hasFile = file != null && file.fileName() != null && !file.fileName().isBlank();
		if (!hasFile)
		{
			flash("error", "Bitte wählen Sie eine Datei aus");
			redirect(DocumentResource.class).create();
			return;
		}

		Document document = new Document();
		document.setDocumentType(DocumentType.valueOf(documentType));
		document.setTotal(java.math.BigDecimal.ZERO); // Placeholder, will be
														// filled by AI
		document.setCurrencyCode("EUR");
		document.setAnalysisStatus(AnalysisStatus.PENDING);
		document.setDocumentStatus(DocumentStatus.UPLOADED);
		document.setUploadedBy(securityIdentity.getPrincipal().getName());

		handleFileUpload(document, file);
		documentRepository.persist(document);

		// Trigger AI analysis workflow (auto-start as per user preference)
		triggerDocumentAnalysis(document);

		// Redirect to review page where user can see AI results
		redirect(DocumentResource.class).review(document.getId());
	}

	/**
	 * Manually trigger analysis for an uploaded document.
	 */
	@POST
	@Transactional
	@Path("/{id}/analyze")
	public void analyzeDocument(Long id)
	{
		Document document = documentRepository.findById(id);
		if (document == null)
		{
			flash("error", "Beleg nicht gefunden");
			redirect(DocumentResource.class).index(null);
			return;
		}

		if (!document.hasFile())
		{
			flash("error", "Kein Dokument vorhanden zum Analysieren");
			redirect(DocumentResource.class).show(id);
			return;
		}

		if (document.getDocumentStatus() != DocumentStatus.UPLOADED
			&& document.getDocumentStatus() != DocumentStatus.FAILED)
		{
			flash("warning", "Dokument wurde bereits analysiert");
			redirect(DocumentResource.class).show(id);
			return;
		}

		// Start workflow
		triggerDocumentAnalysis(document);

		flash("info", "Analyse gestartet");
		redirect(DocumentResource.class).review(id);
	}

	/**
	 * Complete the review UserTask in the workflow with user's confirmed data.
	 */
	@POST
	@Transactional
	@Path("/{id}/complete-review")
	public void completeReview(
		@RestForm @NotNull Long id,
		@RestForm @NotNull Boolean confirmed,
		@RestForm @NotNull Boolean reanalyze,
		@RestForm @NotNull String documentType,
		@RestForm String name,
		@RestForm @NotNull BigDecimal total,
		@RestForm BigDecimal totalTax,
		@RestForm String currencyCode,
		@RestForm String transactionDate,
		@RestForm Long bommelId,
		@RestForm String senderName,
		@RestForm String senderStreet,
		@RestForm String senderZipCode,
		@RestForm String senderCity,
		@RestForm boolean privatelyPaid,
		@RestForm String invoiceId,
		@RestForm String orderNumber,
		@RestForm String dueDate,
		@RestForm String tags)
	{
		Document document = documentRepository.findById(id);
		if (document == null)
		{
			flash("error", "Beleg nicht gefunden");
			redirect(DocumentResource.class).index(null);
			return;
		}

		// Build user input map for workflow
		Map<String, Object> userInput = new java.util.HashMap<>();
		userInput.put("id", id);
		userInput.put("confirmed", confirmed);
		userInput.put("reanalyze", reanalyze);
		userInput.put("documentType", documentType);
		userInput.put("name", name);
		userInput.put("total", total);
		userInput.put("totalTax", totalTax);
		userInput.put("currencyCode", currencyCode);
		userInput.put("transactionDate", transactionDate);
		userInput.put("bommelId", bommelId);
		userInput.put("senderName", senderName);
		userInput.put("senderStreet", senderStreet);
		userInput.put("senderZipCode", senderZipCode);
		userInput.put("senderCity", senderCity);
		userInput.put("privatelyPaid", privatelyPaid);
		userInput.put("invoiceId", invoiceId);
		userInput.put("orderNumber", orderNumber);
		userInput.put("dueDate", dueDate);
		userInput.put("tags", tags);

		// Complete the UserTask in the workflow
		if (document.getWorkflowInstanceId() != null)
		{
			try
			{
				document.setReviewedBy(securityIdentity.getPrincipal().getName());
				processEngine.completeUserTask(
					document.getWorkflowInstanceId(),
					userInput,
					securityIdentity.getPrincipal().getName());
				LOG.info("Review completed via workflow: documentId={}, workflowInstanceId={}",
					id, document.getWorkflowInstanceId());
			}
			catch (Exception e)
			{
				LOG.error("Failed to complete workflow user task: documentId={}, error={}",
					id, e.getMessage(), e);
				flash("error", "Fehler beim Abschließen der Prüfung: " + e.getMessage());
				redirect(DocumentResource.class).review(id);
				return;
			}
		}
		else
		{
			// No workflow - direct save (backward compatibility for manual
			// entry)
			LOG.info("No workflow instance found, saving directly: documentId={}", id);
			applyFormDataDirectly(document, userInput);
			document.setDocumentStatus(DocumentStatus.CONFIRMED);
		}

		if (Boolean.TRUE.equals(confirmed))
		{
			flash("success", "Beleg gespeichert");
			redirect(DocumentResource.class).show(id);
		}
		else if (Boolean.TRUE.equals(reanalyze))
		{
			flash("info", "Beleg wird erneut analysiert");
			redirect(DocumentResource.class).review(id);
		}
		else
		{
			flash("info", "Beleg zur manuellen Eingabe vorbereitet");
			redirect(DocumentResource.class).show(id);
		}
	}

	/**
	 * Apply form data directly to document (for backward compatibility when no
	 * workflow exists).
	 */
	private void applyFormDataDirectly(Document document, Map<String, Object> userInput)
	{
		String documentType = (String)userInput.get("documentType");
		if (documentType != null)
		{
			document.setDocumentType(DocumentType.valueOf(documentType));
		}

		document.setName((String)userInput.get("name"));
		document.setTotal((BigDecimal)userInput.get("total"));
		document.setTotalTax((BigDecimal)userInput.get("totalTax"));

		String currencyCode = (String)userInput.get("currencyCode");
		document.setCurrencyCode(
			currencyCode != null && !currencyCode.isBlank() ? currencyCode : "EUR");

		Boolean privatelyPaid = (Boolean)userInput.get("privatelyPaid");
		document.setPrivatelyPaid(Boolean.TRUE.equals(privatelyPaid));

		String transactionDate = (String)userInput.get("transactionDate");
		if (transactionDate != null && !transactionDate.isBlank())
		{
			LocalDate date = LocalDate.parse(transactionDate);
			document.setTransactionTime(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
		}
		else
		{
			document.setTransactionTime(null);
		}

		Long bommelId = (Long)userInput.get("bommelId");
		if (bommelId != null && bommelId > 0)
		{
			Bommel bommel = bommelRepository.findById(bommelId);
			document.setBommel(bommel);
		}
		else
		{
			document.setBommel(null);
		}

		String senderName = (String)userInput.get("senderName");
		if (senderName != null && !senderName.isBlank())
		{
			TradeParty sender = document.getSender();
			if (sender == null)
			{
				sender = new TradeParty();
			}
			sender.setName(senderName);
			sender.setStreet((String)userInput.get("senderStreet"));
			sender.setZipCode((String)userInput.get("senderZipCode"));
			sender.setCity((String)userInput.get("senderCity"));
			document.setSender(sender);
		}
		else if (document.getSender() != null)
		{
			document.setSender(null);
		}

		document.setInvoiceId((String)userInput.get("invoiceId"));
		document.setOrderNumber((String)userInput.get("orderNumber"));

		String dueDate = (String)userInput.get("dueDate");
		if (dueDate != null && !dueDate.isBlank())
		{
			LocalDate date = LocalDate.parse(dueDate);
			document.setDueDate(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
		}
		else
		{
			document.setDueDate(null);
		}

		updateDocumentTags(document, (String)userInput.get("tags"));
	}

	/**
	 * Step 2: Save reviewed document (after AI analysis) - kept for backward
	 * compatibility
	 */
	@POST
	@Transactional
	public void save(
		@RestForm @NotNull Long id,
		@RestForm @NotNull String documentType,
		@RestForm String name,
		@RestForm @NotNull BigDecimal total,
		@RestForm BigDecimal totalTax,
		@RestForm String currencyCode,
		@RestForm String transactionDate,
		@RestForm Long bommelId,
		@RestForm String senderName,
		@RestForm String senderStreet,
		@RestForm String senderZipCode,
		@RestForm String senderCity,
		@RestForm boolean privatelyPaid,
		@RestForm String invoiceId,
		@RestForm String orderNumber,
		@RestForm String dueDate,
		@RestForm String tags)
	{
		Document document = documentRepository.findById(id);
		if (document == null)
		{
			flash("error", "Beleg nicht gefunden");
			redirect(DocumentResource.class).index(null);
			return;
		}

		document.setDocumentType(DocumentType.valueOf(documentType));
		document.setName(name);
		document.setTotal(total);
		document.setTotalTax(totalTax);
		document.setCurrencyCode(currencyCode != null && !currencyCode.isBlank() ? currencyCode : "EUR");
		document.setPrivatelyPaid(privatelyPaid);

		if (transactionDate != null && !transactionDate.isBlank())
		{
			LocalDate date = LocalDate.parse(transactionDate);
			document.setTransactionTime(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
		}
		else
		{
			document.setTransactionTime(null);
		}

		if (bommelId != null && bommelId > 0)
		{
			Bommel bommel = bommelRepository.findById(bommelId);
			document.setBommel(bommel);
		}
		else
		{
			document.setBommel(null);
		}

		if (senderName != null && !senderName.isBlank())
		{
			TradeParty sender = document.getSender();
			if (sender == null)
			{
				sender = new TradeParty();
			}
			sender.setName(senderName);
			sender.setStreet(senderStreet);
			sender.setZipCode(senderZipCode);
			sender.setCity(senderCity);
			document.setSender(sender);
		}
		else if (document.getSender() != null)
		{
			document.setSender(null);
		}

		// Invoice-specific fields (saved for all document types now)
		document.setInvoiceId(invoiceId);
		document.setOrderNumber(orderNumber);
		if (dueDate != null && !dueDate.isBlank())
		{
			LocalDate date = LocalDate.parse(dueDate);
			document.setDueDate(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
		}
		else
		{
			document.setDueDate(null);
		}

		// Handle tags
		updateDocumentTags(document, tags);

		flash("success", "Beleg gespeichert");
		redirect(DocumentResource.class).show(document.getId());
	}

	private void handleFileUpload(Document document, FileUpload file)
	{
		// Generate unique file key for S3
		String fileKey = "documents/" + UUID.randomUUID() + "/" + file.fileName();

		// Store file metadata
		document.setFileKey(fileKey);
		document.setFileName(file.fileName());
		document.setFileContentType(file.contentType());
		try
		{
			document.setFileSize(java.nio.file.Files.size(file.filePath()));
		}
		catch (Exception e)
		{
			document.setFileSize(0L);
		}

		// Upload file to S3
		storageService.uploadFile(fileKey, file.filePath(), file.contentType());
	}

	@POST
	@Transactional
	public void update(
		@RestForm @NotNull Long id,
		@RestForm @NotNull String documentType,
		@RestForm String name,
		@RestForm @NotNull BigDecimal total,
		@RestForm BigDecimal totalTax,
		@RestForm String currencyCode,
		@RestForm String transactionDate,
		@RestForm Long bommelId,
		@RestForm String senderName,
		@RestForm String senderStreet,
		@RestForm String senderZipCode,
		@RestForm String senderCity,
		@RestForm boolean privatelyPaid,
		@RestForm String invoiceId,
		@RestForm String orderNumber,
		@RestForm String dueDate,
		@RestForm String tags)
	{
		Document document = documentRepository.findById(id);
		if (document == null)
		{
			flash("error", "Beleg nicht gefunden");
			redirect(DocumentResource.class).index(null);
			return;
		}

		document.setDocumentType(DocumentType.valueOf(documentType));
		document.setName(name);
		document.setTotal(total);
		document.setTotalTax(totalTax);
		document.setCurrencyCode(currencyCode != null && !currencyCode.isBlank() ? currencyCode : "EUR");
		document.setPrivatelyPaid(privatelyPaid);

		if (transactionDate != null && !transactionDate.isBlank())
		{
			LocalDate date = LocalDate.parse(transactionDate);
			document.setTransactionTime(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
		}
		else
		{
			document.setTransactionTime(null);
		}

		if (bommelId != null && bommelId > 0)
		{
			Bommel bommel = bommelRepository.findById(bommelId);
			document.setBommel(bommel);
		}
		else
		{
			document.setBommel(null);
		}

		TradeParty sender = document.getSender();
		if (senderName != null && !senderName.isBlank())
		{
			if (sender == null)
			{
				sender = new TradeParty();
			}
			sender.setName(senderName);
			sender.setStreet(senderStreet);
			sender.setZipCode(senderZipCode);
			sender.setCity(senderCity);
			document.setSender(sender);
		}
		else if (sender != null)
		{
			document.setSender(null);
		}

		// Invoice-specific fields (saved for all document types now)
		document.setInvoiceId(invoiceId);
		document.setOrderNumber(orderNumber);
		if (dueDate != null && !dueDate.isBlank())
		{
			LocalDate date = LocalDate.parse(dueDate);
			document.setDueDate(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
		}
		else
		{
			document.setDueDate(null);
		}

		// Handle tags
		updateDocumentTags(document, tags);

		flash("success", "Beleg aktualisiert");
		redirect(DocumentResource.class).show(id);
	}

	/**
	 * Parses comma-separated tag names and updates the document's tags.
	 * Preserves AI source for existing tags, adds new tags as MANUAL. Uses a
	 * diff-based approach to avoid Hibernate INSERT/DELETE ordering issues.
	 */
	private void updateDocumentTags(Document document, String tagsInput)
	{
		// Parse new tag names from input
		Set<String> newTagNames = new HashSet<>();
		if (tagsInput != null && !tagsInput.isBlank())
		{
			newTagNames = Arrays.stream(tagsInput.split(","))
				.map(String::trim)
				.map(String::toLowerCase)
				.filter(s -> !s.isEmpty())
				.collect(Collectors.toSet());
		}

		// Build map of current tag name -> DocumentTag (to preserve and reuse)
		Map<String, app.hopps.document.domain.DocumentTag> existingTags = document.getDocumentTags().stream()
			.collect(Collectors.toMap(
				dt -> dt.getName().toLowerCase(),
				dt -> dt,
				(a, b) -> a));

		// Find tags to remove (existing but not in new set)
		Set<String> existingTagNames = existingTags.keySet();
		Set<String> tagsToRemove = new HashSet<>(existingTagNames);
		tagsToRemove.removeAll(newTagNames);

		// Find tags to add (in new set but not existing)
		Set<String> tagsToAdd = new HashSet<>(newTagNames);
		tagsToAdd.removeAll(existingTagNames);

		// Remove tags that are no longer needed
		for (String tagName : tagsToRemove)
		{
			app.hopps.document.domain.DocumentTag docTag = existingTags.get(tagName);
			document.getDocumentTags().remove(docTag);
		}

		// Add new tags
		if (!tagsToAdd.isEmpty())
		{
			Set<Tag> tagEntities = tagRepository.findOrCreateTags(tagsToAdd);
			for (Tag tag : tagEntities)
			{
				document.addTag(tag, TagSource.MANUAL);
			}
		}
	}

	@POST
	@Transactional
	public void delete(@RestForm @NotNull Long id)
	{
		Document document = documentRepository.findById(id);
		if (document == null)
		{
			flash("error", "Beleg nicht gefunden");
			redirect(DocumentResource.class).index(null);
			return;
		}

		// Delete file from storage if exists
		if (document.hasFile())
		{
			deleteFileFromStorage(document.getFileKey());
		}

		documentRepository.delete(document);
		flash("success", "Beleg gelöscht");
		redirect(DocumentResource.class).index(null);
	}

	@POST
	@Transactional
	@Path("/uploadFile")
	public void uploadFile(@RestForm @NotNull Long documentId, @RestForm("file") FileUpload file)
	{
		Document document = documentRepository.findById(documentId);
		if (document == null)
		{
			flash("error", "Beleg nicht gefunden");
			redirect(DocumentResource.class).index(null);
			return;
		}

		if (file == null || file.fileName() == null || file.fileName().isBlank())
		{
			flash("error", "Keine Datei ausgewählt");
			redirect(DocumentResource.class).show(documentId);
			return;
		}

		// Delete old file if exists
		if (document.hasFile())
		{
			deleteFileFromStorage(document.getFileKey());
		}

		handleFileUpload(document, file);

		// Trigger AI analysis workflow for newly uploaded file
		triggerDocumentAnalysis(document);

		flash("success", "Datei hochgeladen: " + file.fileName());
		redirect(DocumentResource.class).show(documentId);
	}

	@POST
	@Transactional
	@Path("/deleteFile")
	public void deleteFile(@RestForm @NotNull Long documentId)
	{
		Document document = documentRepository.findById(documentId);
		if (document == null)
		{
			flash("error", "Beleg nicht gefunden");
			redirect(DocumentResource.class).index(null);
			return;
		}

		if (document.hasFile())
		{
			deleteFileFromStorage(document.getFileKey());
			document.setFileKey(null);
			document.setFileName(null);
			document.setFileContentType(null);
			document.setFileSize(null);
			flash("success", "Datei gelöscht");
		}
		else
		{
			flash("error", "Keine Datei vorhanden");
		}

		redirect(DocumentResource.class).show(documentId);
	}

	@GET
	@Path("/{id}/download")
	@Produces(MediaType.APPLICATION_OCTET_STREAM)
	public Response downloadFile(Long id)
	{
		Document document = documentRepository.findById(id);
		if (document == null || !document.hasFile())
		{
			return Response.status(Response.Status.NOT_FOUND).build();
		}

		var inputStream = storageService.downloadFile(document.getFileKey());
		return Response.ok(inputStream)
			.header("Content-Disposition", "attachment; filename=\"" + document.getFileName() + "\"")
			.header("Content-Type", document.getFileContentType())
			.build();
	}

	@GET
	@Path("/{id}/view")
	@Produces(MediaType.APPLICATION_OCTET_STREAM)
	public Response viewFile(Long id)
	{
		Document document = documentRepository.findById(id);
		if (document == null || !document.hasFile())
		{
			return Response.status(Response.Status.NOT_FOUND).build();
		}

		var inputStream = storageService.downloadFile(document.getFileKey());
		return Response.ok(inputStream)
			.header("Content-Disposition", "inline; filename=\"" + document.getFileName() + "\"")
			.header("Content-Type", document.getFileContentType())
			.build();
	}

	private void deleteFileFromStorage(String fileKey)
	{
		storageService.deleteFile(fileKey);
	}

	private void triggerDocumentAnalysis(Document document)
	{
		try
		{
			WorkflowInstance instance = documentProcessingWorkflow.startProcessing(document.getId());
			document.setWorkflowInstanceId(instance.getId());
			document.setAnalyzedBy(securityIdentity.getPrincipal().getName());
			LOG.info("Document processing workflow triggered: documentId={}, workflowInstanceId={}",
				document.getId(), instance.getId());
		}
		catch (Exception e)
		{
			LOG.warn("Document analysis failed, continuing without autofill: documentId={}, error={}",
				document.getId(), e.getMessage());
			// Don't fail the upload if analysis fails - it's an enhancement,
			// not critical
		}
	}

	@POST
	@Transactional
	public void assignToBommel(@RestForm @NotNull Long documentId, @RestForm Long bommelId)
	{
		Document document = documentRepository.findById(documentId);
		if (document == null)
		{
			flash("error", "Beleg nicht gefunden");
			redirect(DocumentResource.class).index(null);
			return;
		}

		if (bommelId != null && bommelId > 0)
		{
			Bommel bommel = bommelRepository.findById(bommelId);
			document.setBommel(bommel);
			flash("success", "Beleg zugewiesen zu: " + bommel.getTitle());
		}
		else
		{
			document.setBommel(null);
			flash("success", "Bommel-Zuweisung entfernt");
		}

		redirect(DocumentResource.class).show(documentId);
	}

	/**
	 * Creates a new TransactionRecord from an existing Document. Copies all
	 * relevant data including sender, tags, and invoice details.
	 */
	@POST
	@Transactional
	@Path("/{id}/create-transaction")
	public void createTransactionFromDocument(Long id)
	{
		Document document = documentRepository.findById(id);
		if (document == null)
		{
			flash("error", "Beleg nicht gefunden");
			redirect(DocumentResource.class).index(null);
			return;
		}

		// Create transaction from document
		TransactionRecord transaction = new TransactionRecord(
			document.getTotal(),
			document.getDocumentType(),
			securityIdentity.getPrincipal().getName());

		// Link to document
		transaction.setDocument(document);

		// Copy core fields
		transaction.setName(document.getName());
		transaction.setTransactionTime(document.getTransactionTime());
		transaction.setBommel(document.getBommel());
		transaction.setPrivatelyPaid(document.isPrivatelyPaid());
		transaction.setCurrencyCode(
			document.getCurrencyCode() != null ? document.getCurrencyCode() : "EUR");

		// Copy sender (create new TradeParty instance to avoid shared
		// references)
		if (document.getSender() != null)
		{
			TradeParty sender = new TradeParty();
			sender.setName(document.getSender().getName());
			sender.setStreet(document.getSender().getStreet());
			sender.setZipCode(document.getSender().getZipCode());
			sender.setCity(document.getSender().getCity());
			transaction.setSender(sender);
		}

		// Copy invoice fields
		transaction.setInvoiceId(document.getInvoiceId());
		transaction.setOrderNumber(document.getOrderNumber());
		transaction.setDueDate(document.getDueDate());
		transaction.setAmountDue(
			document.getDueDate() != null ? document.getTotal() : null);

		// Copy tags (preserve AI source)
		for (DocumentTag docTag : document.getDocumentTags())
		{
			app.hopps.transaction.domain.TagSource source = docTag.getSource() == TagSource.AI
				? app.hopps.transaction.domain.TagSource.AI
				: app.hopps.transaction.domain.TagSource.MANUAL;
			transaction.addTag(docTag.getTag(), source);
		}

		transactionRepository.persist(transaction);

		LOG.info("Transaction created from document: documentId={}, transactionId={}",
			document.getId(), transaction.getId());
		flash("success", "Transaktion erstellt aus Beleg \"" + document.getDisplayName() + "\"");
		redirect(app.hopps.transaction.api.TransactionResource.class).show(transaction.getId());
	}
}
