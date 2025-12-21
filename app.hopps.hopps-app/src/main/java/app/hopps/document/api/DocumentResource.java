package app.hopps.document.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.domain.TradeParty;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.StorageService;
import app.hopps.document.workflow.DocumentAnalysisWorkflow;
import io.quarkiverse.renarde.Controller;
import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
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

@Path("/belege")
public class DocumentResource extends Controller
{
	private static final Logger LOG = LoggerFactory.getLogger(DocumentResource.class);

	@Inject
	DocumentRepository documentRepository;

	@Inject
	BommelRepository bommelRepository;

	@Inject
	StorageService storageService;

	@Inject
	DocumentAnalysisWorkflow documentAnalysisWorkflow;

	@CheckedTemplate
	public static class Templates
	{
		public static native TemplateInstance index(List<Document> documents);

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
		return Templates.index(documents);
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

		handleFileUpload(document, file);
		documentRepository.persist(document);

		// Trigger AI analysis workflow
		triggerDocumentAnalysis(document.getId());

		// Redirect to review page where user can see AI results
		redirect(DocumentResource.class).review(document.getId());
	}

	/**
	 * Step 2: Save reviewed document (after AI analysis)
	 */
	@POST
	@Transactional
	public void save(
		@RestForm @NotNull Long id,
		@RestForm @NotNull String documentType,
		@RestForm String name,
		@RestForm @NotNull BigDecimal total,
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
		@RestForm String dueDate)
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

		if (DocumentType.INVOICE.name().equals(documentType))
		{
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
		}

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
		@RestForm String dueDate)
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

		if (DocumentType.INVOICE.name().equals(documentType))
		{
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
		}

		flash("success", "Beleg aktualisiert");
		redirect(DocumentResource.class).show(id);
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
		triggerDocumentAnalysis(documentId);

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

	private void deleteFileFromStorage(String fileKey)
	{
		storageService.deleteFile(fileKey);
	}

	private void triggerDocumentAnalysis(Long documentId)
	{
		try
		{
			documentAnalysisWorkflow.startAnalysis(documentId);
			LOG.info("Document analysis workflow triggered for document: {}", documentId);
		}
		catch (Exception e)
		{
			LOG.warn("Document analysis failed, continuing without autofill: documentId={}, error={}",
				documentId, e.getMessage());
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
}
