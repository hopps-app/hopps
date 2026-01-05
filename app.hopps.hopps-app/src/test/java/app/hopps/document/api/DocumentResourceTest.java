package app.hopps.document.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.containsString;
import static org.hamcrest.CoreMatchers.is;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.Document;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.StorageService;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.BaseOrganizationTest;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;

@QuarkusTest
class DocumentResourceTest extends BaseOrganizationTest
{
	@Inject
	DocumentRepository documentRepository;

	@Inject
	BommelRepository bommelRepository;

	@Inject
	StorageService storageService;

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldShowEmptyStateWhenNoDocumentsExist()
	{
		deleteAllData();

		given()
			.when()
			.get("/belege")
			.then()
			.statusCode(200)
			.body(containsString("Noch keine Belege vorhanden"))
			.body(containsString("Ersten Beleg anlegen"));
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldShowDocumentsInTable()
	{
		deleteAllData();
		createDocument("Rechnung Test", new BigDecimal("100.00"));

		given()
			.when()
			.get("/belege")
			.then()
			.statusCode(200)
			.body(containsString("Rechnung Test"))
			.body(containsString("100,00"));
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldShowDocumentDetailPage()
	{
		deleteAllData();
		Long docId = createDocument("Quittung Detail", new BigDecimal("50.00"));

		given()
			.when()
			.get("/belege/" + docId)
			.then()
			.statusCode(200)
			.body(containsString("Quittung Detail"))
			.body(containsString("50"));
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldShowCreateDocumentForm()
	{
		given()
			.when()
			.get("/belege/neu")
			.then()
			.statusCode(200)
			.body(containsString("Beleg hochladen"))
			.body(containsString("Datei hochladen"));
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldRedirectToIndexForNonExistentDocument()
	{
		deleteAllData();

		given()
			.redirects().follow(false)
			.when()
			.get("/belege/99999")
			.then()
			.statusCode(303);
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldShowDocumentWithBommelAssignment()
	{
		deleteAllData();
		Long bommelId = createBommel("Test Bommel");
		Long docId = createDocumentWithBommel("Rechnung mit Bommel", new BigDecimal("200.00"),
			bommelId);

		given()
			.when()
			.get("/belege/" + docId)
			.then()
			.statusCode(200)
			.body(containsString("Test Bommel"));
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldShowFileUploadFormOnCreatePage()
	{
		given()
			.when()
			.get("/belege/neu")
			.then()
			.statusCode(200)
			.body(containsString("enctype=\"multipart/form-data\""))
			.body(containsString("name=\"file\""))
			.body(containsString("cds-file-uploader"))
			.body(containsString("Datei auswählen"));
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldDownloadUploadedFile()
	{
		deleteAllData();

		// Create a document with file metadata
		String testContent = "Test download content";
		Long docId = createDocumentWithFile("Download Test Doc", testContent.getBytes());

		given()
			.when()
			.get("/belege/" + docId + "/download")
			.then()
			.statusCode(200)
			.header("Content-Disposition", containsString("test-file.txt"))
			.body(is(testContent));
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldReturn404ForDownloadWithNoFile()
	{
		deleteAllData();
		Long docId = createDocument("No File Doc", new BigDecimal("10.00"));

		given()
			.when()
			.get("/belege/" + docId + "/download")
			.then()
			.statusCode(404);
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldReturn404ForDownloadNonExistentDocument()
	{
		deleteAllData();

		given()
			.when()
			.get("/belege/99999/download")
			.then()
			.statusCode(404);
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldShowDeleteFileButtonOnDetailPage()
	{
		deleteAllData();
		Long docId = createDocumentWithFile("Doc with File", "content".getBytes());

		given()
			.when()
			.get("/belege/" + docId)
			.then()
			.statusCode(200)
			.body(containsString("test-file.txt"))
			.body(containsString("deleteFile"));
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldShowUploadFormOnDetailPage()
	{
		deleteAllData();
		Long docId = createDocument("Doc without File", new BigDecimal("25.00"));

		given()
			.when()
			.get("/belege/" + docId)
			.then()
			.statusCode(200)
			.body(containsString("uploadFile"))
			.body(containsString("Datei hochladen"));
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldShowFileIndicatorInList()
	{
		deleteAllData();
		createDocumentWithFile("Doc with File", "content".getBytes());

		given()
			.when()
			.get("/belege")
			.then()
			.statusCode(200)
			.body(containsString("has-file"))
			.body(containsString("Datei"));
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldFilterDocumentsByBommel()
	{
		deleteAllData();
		Long bommelId = createBommel("Filter Bommel");
		createDocumentWithBommel("Filtered Doc", new BigDecimal("10.00"), bommelId);
		createDocument("Other Doc", new BigDecimal("20.00"));

		given()
			.queryParam("bommelId", bommelId)
			.when()
			.get("/belege")
			.then()
			.statusCode(200)
			.body(containsString("Filtered Doc"));
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldShowTransactionCreationAlertForConfirmedDocuments()
	{
		deleteAllData();
		createConfirmedDocument("Confirmed Doc", new BigDecimal("100.00"));

		given()
			.when()
			.get("/belege")
			.then()
			.statusCode(200)
			.body(containsString("kann in eine Transaktion umgewandelt werden"))
			.body(containsString("Transaktion erstellen"));
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	void deleteAllData()
	{
		documentRepository.deleteAll();
		bommelRepository.deleteAll();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createDocument(String name, BigDecimal total)
	{
		Organization organization = getOrCreateTestOrganization();

		Document document = new Document();
		document.setName(name);
		document.setTotal(total);
		document.setCurrencyCode("EUR");
		document.setOrganization(organization);
		documentRepository.persist(document);
		return document.getId();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createDocumentWithBommel(String name, BigDecimal total, Long bommelId)
	{
		Organization organization = getOrCreateTestOrganization();

		Bommel bommel = bommelRepository.findById(bommelId);
		Document document = new Document();
		document.setName(name);
		document.setTotal(total);
		document.setCurrencyCode("EUR");
		document.setBommel(bommel);
		document.setOrganization(organization);
		documentRepository.persist(document);
		return document.getId();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createBommel(String title)
	{
		Organization organization = getOrCreateTestOrganization();

		Bommel bommel = new Bommel();
		bommel.setIcon("folder");
		bommel.setTitle(title);
		bommel.setOrganization(organization);
		bommelRepository.persist(bommel);
		return bommel.getId();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createDocumentWithFile(String name, byte[] content)
	{
		Organization organization = getOrCreateTestOrganization();

		Document document = new Document();
		document.setName(name);
		document.setTotal(new BigDecimal("10.00"));
		document.setCurrencyCode("EUR");
		document.setOrganization(organization);

		String fileKey = "test-documents/" + System.currentTimeMillis() + "/test-file.txt";
		document.setFileKey(fileKey);
		document.setFileName("test-file.txt");
		document.setFileContentType("text/plain");
		document.setFileSize((long)content.length);

		// Upload to S3
		storageService.uploadFile(fileKey, content, "text/plain");

		documentRepository.persist(document);
		return document.getId();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createConfirmedDocument(String name, BigDecimal total)
	{
		Organization organization = getOrCreateTestOrganization();

		Document document = new Document();
		document.setName(name);
		document.setTotal(total);
		document.setCurrencyCode("EUR");
		document.setDocumentStatus(app.hopps.document.domain.DocumentStatus.CONFIRMED);
		document.setOrganization(organization);
		documentRepository.persist(document);
		return document.getId();
	}
}
