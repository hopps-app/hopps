package app.hopps.document.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.domain.TradeParty;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.StorageService;
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
	@Inject
	DocumentRepository documentRepository;

	@Inject
	BommelRepository bommelRepository;

	@Inject
	StorageService storageService;

	@CheckedTemplate
	public static class Templates
	{
		public static native TemplateInstance index(List<Document> documents);

		public static native TemplateInstance create(List<Bommel> bommels);

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
		List<Bommel> bommels = bommelRepository.listAll();
		return Templates.create(bommels);
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

	@POST
	@Transactional
	public void save(
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
		@RestForm String dueDate,
		@RestForm("file") FileUpload file)
	{
		if (validationFailed())
		{
			redirect(DocumentResource.class).create();
			return;
		}

		Document document = new Document();
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

		if (bommelId != null && bommelId > 0)
		{
			Bommel bommel = bommelRepository.findById(bommelId);
			document.setBommel(bommel);
		}

		if (senderName != null && !senderName.isBlank())
		{
			TradeParty sender = new TradeParty();
			sender.setName(senderName);
			sender.setStreet(senderStreet);
			sender.setZipCode(senderZipCode);
			sender.setCity(senderCity);
			document.setSender(sender);
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
		}

		// Handle file upload
		if (file != null && file.fileName() != null && !file.fileName().isBlank())
		{
			handleFileUpload(document, file);
		}

		documentRepository.persist(document);

		flash("success", "Beleg erstellt");
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
