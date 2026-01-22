package app.fuggs.document.api;

import app.fuggs.bommel.domain.Bommel;
import app.fuggs.bommel.repository.BommelRepository;
import app.fuggs.document.domain.AnalysisStatus;
import app.fuggs.document.domain.Document;
import app.fuggs.document.domain.DocumentStatus;
import app.fuggs.document.domain.DocumentTag;
import app.fuggs.document.domain.TagSource;
import app.fuggs.document.domain.TradeParty;
import app.fuggs.document.repository.DocumentRepository;
import app.fuggs.document.service.DocumentAnalysisService;
import app.fuggs.document.service.DocumentDataService;
import app.fuggs.document.service.DocumentFileService;
import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.security.OrganizationContext;
import app.fuggs.shared.util.FlashKeys;
import app.fuggs.transaction.domain.TransactionRecord;
import app.fuggs.transaction.repository.TransactionRecordRepository;
import app.fuggs.workflow.ProcessEngine;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Authenticated
@Path("/belege")
public class DocumentResource extends Controller
{
	private static final Logger LOG = LoggerFactory.getLogger(DocumentResource.class);
	public static final String BELEG_NICHT_GEFUNDEN = "Beleg nicht gefunden";
	public static final String KI_DIENST_NICHT_VERFÜGBAR_BITTE_FÜLLEN_SIE_DIE_FELDER_MANUELL_AUS = "KI-Dienst nicht verfügbar. Bitte füllen Sie die Felder manuell aus.";

	@Inject
	DocumentRepository documentRepository;

	@Inject
	BommelRepository bommelRepository;

	@Inject
	TransactionRecordRepository transactionRepository;

	@Inject
	ProcessEngine processEngine;

	@Inject
	SecurityIdentity securityIdentity;

	@Inject
	DocumentFileService fileService;

	@Inject
	DocumentAnalysisService analysisService;

	@Inject
	DocumentDataService dataService;

	@Inject
	OrganizationContext organizationContext;

	@CheckedTemplate
	public static class Templates
	{
		private Templates()
		{
			// static
		}

		public static native TemplateInstance index(List<Document> documents, List<Document> documentsNeedingReview, List<Document> documentsNeedingTransaction);

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

		// Populate transaction counts for each document
		enrichDocumentsWithTransactionCounts(documents);

		// Filter documents that need review (status = ANALYZED)
		List<Document> documentsNeedingReview = documents.stream()
			.filter(d -> d.getDocumentStatus() != null && d.getDocumentStatus() == DocumentStatus.ANALYZED)
			.toList();

		// Filter documents that need transaction creation (confirmed but no
		// transactions)
		List<Document> documentsNeedingTransaction = documents.stream()
			.filter(d -> d.getDocumentStatus() != null && d.getDocumentStatus() == DocumentStatus.CONFIRMED)
			.filter(d -> d.getTransactionCount() == 0)
			.toList();

		return Templates.index(documents, documentsNeedingReview, documentsNeedingTransaction);
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
		Document document = documentRepository.findByIdScoped(id);
		if (document == null)
		{
			flash(FlashKeys.ERROR, BELEG_NICHT_GEFUNDEN);
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
		Document document = documentRepository.findByIdScoped(id);
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
		Document document = documentRepository.findByIdScoped(id);
		if (document == null)
		{
			flash(FlashKeys.ERROR, BELEG_NICHT_GEFUNDEN);
			redirect(DocumentResource.class).index(null);
			return null;
		}

		// Populate transaction count for display
		long count = transactionRepository.findByDocument(id).size();
		document.setTransactionCount(count);

		List<Bommel> bommels = bommelRepository.listAll();
		return Templates.show(document, bommels);
	}

	/**
	 * Enriches documents with transaction counts using a single optimized
	 * query.
	 */
	private void enrichDocumentsWithTransactionCounts(List<Document> documents)
	{
		if (documents.isEmpty())
		{
			return;
		}

		// Get all document IDs
		List<Long> documentIds = documents.stream()
			.map(Document::getId)
			.toList();

		// Execute single query to get counts for all documents
		// Uses JPQL query for optimal performance
		@SuppressWarnings("unchecked")
		List<Object[]> results = documentRepository.getEntityManager()
			.createQuery(
				"SELECT t.document.id, COUNT(t) " +
					"FROM TransactionRecord t " +
					"WHERE t.document.id IN :ids " +
					"GROUP BY t.document.id",
				Object[].class)
			.setParameter("ids", documentIds)
			.getResultList();

		// Create map of documentId -> count
		Map<Long, Long> countMap = results.stream()
			.collect(Collectors.toMap(
				arr -> (Long)arr[0],
				arr -> (Long)arr[1]));

		// Populate counts on documents
		for (Document doc : documents)
		{
			Long count = countMap.getOrDefault(doc.getId(), 0L);
			doc.setTransactionCount(count);
		}
	}

	/**
	 * Step 1: Upload file and create document
	 */
	@POST
	@Path("/upload")
	public void upload(@RestForm("file") FileUpload file)
	{
		if (validationFailed())
		{
			redirect(DocumentResource.class).create();
			return;
		}

		boolean hasFile = file != null && file.fileName() != null && !file.fileName().isBlank();
		if (!hasFile)
		{
			flash(FlashKeys.ERROR, "Bitte wählen Sie eine Datei aus");
			redirect(DocumentResource.class).create();
			return;
		}

		// Create and persist a document in a separate transaction
		// This prevents transaction rollback when redirect() throws
		// RedirectException
		Long documentId = createAndPersistDocument(file);

		// Redirect to review page where user can see AI results
		redirect(DocumentResource.class).review(documentId);
	}

	@Transactional(Transactional.TxType.REQUIRES_NEW)
	Long createAndPersistDocument(FileUpload file)
	{
		// Get current organization
		Organization currentOrg = organizationContext.getCurrentOrganization();
		if (currentOrg == null)
		{
			throw new IllegalStateException("Organization not found");
		}

		Document document = new Document();
		document.setTotal(java.math.BigDecimal.ZERO);
		// Placeholder will be filled by AI
		document.setCurrencyCode("EUR");
		document.setAnalysisStatus(AnalysisStatus.PENDING);
		document.setDocumentStatus(DocumentStatus.UPLOADED);
		document.setUploadedBy(securityIdentity.getPrincipal().getName());
		document.setOrganization(currentOrg);

		handleFileUpload(document, file);
		documentRepository.persist(document);

		// Trigger AI analysis workflow (auto-start as per user preference)
		boolean analysisStarted = triggerDocumentAnalysis(document);

		if (!analysisStarted)
		{
			analysisService.markAnalysisFailed(document,
				KI_DIENST_NICHT_VERFÜGBAR_BITTE_FÜLLEN_SIE_DIE_FELDER_MANUELL_AUS);
		}

		return document.getId();
	}

	/**
	 * Manually trigger analysis for an uploaded document.
	 */
	@POST
	@Transactional
	@Path("/{id}/analyze")
	public void analyzeDocument(Long id)
	{
		Document document = documentRepository.findByIdScoped(id);
		if (document == null)
		{
			flash(FlashKeys.ERROR, BELEG_NICHT_GEFUNDEN);
			redirect(DocumentResource.class).index(null);
			return;
		}

		if (!document.hasFile())
		{
			flash(FlashKeys.ERROR, "Kein Dokument vorhanden zum Analysieren");
			redirect(DocumentResource.class).show(id);
			return;
		}

		if (document.getDocumentStatus() != DocumentStatus.UPLOADED
			&& document.getDocumentStatus() != DocumentStatus.FAILED)
		{
			flash(FlashKeys.WARNING, "Dokument wurde bereits analysiert");
			redirect(DocumentResource.class).show(id);
			return;
		}

		// Start workflow
		boolean analysisStarted = triggerDocumentAnalysis(document);

		if (analysisStarted)
		{
			flash(FlashKeys.INFO, "Analyse gestartet");
		}
		else
		{
			analysisService.markAnalysisFailed(document,
				KI_DIENST_NICHT_VERFÜGBAR_BITTE_FÜLLEN_SIE_DIE_FELDER_MANUELL_AUS);
			flash(FlashKeys.ERROR, KI_DIENST_NICHT_VERFÜGBAR_BITTE_FÜLLEN_SIE_DIE_FELDER_MANUELL_AUS);
		}

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
		@RestForm String tags)
	{
		Document document = documentRepository.findByIdScoped(id);
		if (document == null)
		{
			flash(FlashKeys.ERROR, BELEG_NICHT_GEFUNDEN);
			redirect(DocumentResource.class).index(null);
			return;
		}

		// Build user input map for workflow
		Map<String, Object> userInput = new java.util.HashMap<>();
		userInput.put("id", id);
		userInput.put("confirmed", confirmed);
		userInput.put("reanalyze", reanalyze);
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
				flash(FlashKeys.ERROR, "Fehler beim Abschließen der Prüfung: " + e.getMessage());
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
			flash(FlashKeys.SUCCESS, "Beleg gespeichert");
			redirect(DocumentResource.class).index(null);
		}
		else if (Boolean.TRUE.equals(reanalyze))
		{
			flash(FlashKeys.INFO, "Beleg wird erneut analysiert");
			redirect(DocumentResource.class).review(id);
		}
		else
		{
			flash(FlashKeys.INFO, "Beleg zur manuellen Eingabe vorbereitet");
			redirect(DocumentResource.class).show(id);
		}
	}

	private void applyFormDataDirectly(Document document, Map<String, Object> userInput)
	{
		dataService.applyFormData(document, userInput);

		// Handle bommel assignment (requires repository access)
		Long bommelId = (Long)userInput.get("bommelId");
		if (bommelId != null && bommelId > 0)
		{
			Bommel bommel = bommelRepository.findByIdScoped(bommelId);
			document.setBommel(bommel);
		}
		else
		{
			document.setBommel(null);
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
		@RestForm String tags)
	{
		Document document = documentRepository.findByIdScoped(id);
		if (document == null)
		{
			flash(FlashKeys.ERROR, BELEG_NICHT_GEFUNDEN);
			redirect(DocumentResource.class).index(null);
			return;
		}

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
			Bommel bommel = bommelRepository.findByIdScoped(bommelId);
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
				sender.setOrganization(document.getOrganization());
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

		// Handle tags
		updateDocumentTags(document, tags);

		flash(FlashKeys.SUCCESS, "Beleg gespeichert");
		redirect(DocumentResource.class).show(document.getId());
	}

	private void handleFileUpload(Document document, FileUpload file)
	{
		fileService.handleFileUpload(document, file);
	}

	@POST
	@Transactional
	public void update(
		@RestForm @NotNull Long id,
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
		@RestForm String tags)
	{
		Document document = documentRepository.findByIdScoped(id);
		if (document == null)
		{
			flash(FlashKeys.ERROR, BELEG_NICHT_GEFUNDEN);
			redirect(DocumentResource.class).index(null);
			return;
		}

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
			Bommel bommel = bommelRepository.findByIdScoped(bommelId);
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
				sender.setOrganization(document.getOrganization());
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

		// Handle tags
		updateDocumentTags(document, tags);

		flash(FlashKeys.SUCCESS, "Beleg aktualisiert");
		redirect(DocumentResource.class).show(id);
	}

	private void updateDocumentTags(Document document, String tagsInput)
	{
		dataService.updateTags(document, tagsInput);
	}

	@POST
	@Transactional
	public void delete(@RestForm @NotNull Long id)
	{
		Document document = documentRepository.findByIdScoped(id);
		if (document == null)
		{
			flash(FlashKeys.ERROR, BELEG_NICHT_GEFUNDEN);
			redirect(DocumentResource.class).index(null);
			return;
		}

		// Delete file from storage if exists
		if (document.hasFile())
		{
			deleteFileFromStorage(document.getFileKey());
		}

		documentRepository.delete(document);
		flash(FlashKeys.SUCCESS, "Beleg gelöscht");
		redirect(DocumentResource.class).index(null);
	}

	@POST
	@Transactional
	@Path("/uploadFile")
	public void uploadFile(@RestForm @NotNull Long documentId, @RestForm("file") FileUpload file)
	{
		Document document = documentRepository.findByIdScoped(documentId);
		if (document == null)
		{
			flash(FlashKeys.ERROR, BELEG_NICHT_GEFUNDEN);
			redirect(DocumentResource.class).index(null);
			return;
		}

		if (file == null || file.fileName() == null || file.fileName().isBlank())
		{
			flash(FlashKeys.ERROR, "Keine Datei ausgewählt");
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
		boolean analysisStarted = triggerDocumentAnalysis(document);

		if (analysisStarted)
		{
			flash(FlashKeys.SUCCESS, "Datei hochgeladen: " + file.fileName() + ". KI-Analyse gestartet.");
		}
		else
		{
			analysisService.markAnalysisFailed(document,
				KI_DIENST_NICHT_VERFÜGBAR_BITTE_FÜLLEN_SIE_DIE_FELDER_MANUELL_AUS);
			flash(FlashKeys.WARNING, "Datei hochgeladen: " + file.fileName() + ". KI-Dienst nicht verfügbar - bitte Felder manuell ausfüllen.");
		}

		redirect(DocumentResource.class).show(documentId);
	}

	@POST
	@Transactional
	@Path("/deleteFile")
	public void deleteFile(@RestForm @NotNull Long documentId)
	{
		Document document = documentRepository.findByIdScoped(documentId);
		if (document == null)
		{
			flash(FlashKeys.ERROR, BELEG_NICHT_GEFUNDEN);
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
			flash(FlashKeys.SUCCESS, "Datei gelöscht");
		}
		else
		{
			flash(FlashKeys.ERROR, "Keine Datei vorhanden");
		}

		redirect(DocumentResource.class).show(documentId);
	}

	@GET
	@Path("/{id}/download")
	@Produces(MediaType.APPLICATION_OCTET_STREAM)
	public Response downloadFile(Long id)
	{
		Document document = documentRepository.findByIdScoped(id);
		if (document == null || !document.hasFile())
		{
			return Response.status(Response.Status.NOT_FOUND).build();
		}

		var inputStream = fileService.downloadFile(document.getFileKey());
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
		Document document = documentRepository.findByIdScoped(id);
		if (document == null || !document.hasFile())
		{
			return Response.status(Response.Status.NOT_FOUND).build();
		}

		var inputStream = fileService.downloadFile(document.getFileKey());
		return Response.ok(inputStream)
			.header("Content-Disposition", "inline; filename=\"" + document.getFileName() + "\"")
			.header("Content-Type", document.getFileContentType())
			.build();
	}

	private void deleteFileFromStorage(String fileKey)
	{
		fileService.deleteFile(fileKey);
	}

	private boolean triggerDocumentAnalysis(Document document)
	{
		return analysisService.triggerAnalysis(document, securityIdentity.getPrincipal().getName());
	}

	@POST
	@Transactional
	public void assignToBommel(@RestForm @NotNull Long documentId, @RestForm Long bommelId)
	{
		Document document = documentRepository.findByIdScoped(documentId);
		if (document == null)
		{
			flash(FlashKeys.ERROR, BELEG_NICHT_GEFUNDEN);
			redirect(DocumentResource.class).index(null);
			return;
		}

		if (bommelId != null && bommelId > 0)
		{
			Bommel bommel = bommelRepository.findByIdScoped(bommelId);
			document.setBommel(bommel);
			flash(FlashKeys.SUCCESS, "Beleg zugewiesen zu: " + bommel.getTitle());
		}
		else
		{
			document.setBommel(null);
			flash(FlashKeys.SUCCESS, "Bommel-Zuweisung entfernt");
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
		Document document = documentRepository.findByIdScoped(id);
		if (document == null)
		{
			flash(FlashKeys.ERROR, BELEG_NICHT_GEFUNDEN);
			redirect(DocumentResource.class).index(null);
			return;
		}

		// Create transaction from document
		TransactionRecord transaction = new TransactionRecord(
			document.getTotal(),
			securityIdentity.getPrincipal().getName());

		// Set organization
		transaction.setOrganization(document.getOrganization());

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
			sender.setOrganization(document.getOrganization());
			transaction.setSender(sender);
		}

		// Copy tags (preserve AI source)
		for (DocumentTag docTag : document.getDocumentTags())
		{
			app.fuggs.transaction.domain.TagSource source = docTag.getSource() == TagSource.AI
				? app.fuggs.transaction.domain.TagSource.AI
				: app.fuggs.transaction.domain.TagSource.MANUAL;
			transaction.addTag(docTag.getTag(), source);
		}

		transactionRepository.persist(transaction);

		LOG.info("Transaction created from document: documentId={}, transactionId={}",
			document.getId(), transaction.getId());
		flash(FlashKeys.SUCCESS, "Transaktion erstellt aus Beleg \"" + document.getDisplayName() + "\"");
		redirect(app.fuggs.transaction.api.TransactionResource.class).show(transaction.getId());
	}
}
