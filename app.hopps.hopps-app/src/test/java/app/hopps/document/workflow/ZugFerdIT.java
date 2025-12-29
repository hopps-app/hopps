package app.hopps.document.workflow;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.containing;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import com.github.tomakehurst.wiremock.client.WireMock;

import app.hopps.document.client.WireMockTestProfile;
import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.StorageService;
import app.hopps.workflow.WorkflowInstance;
import app.hopps.workflow.WorkflowStatus;
import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;

/**
 * Integration test for the ZugFerd document analysis workflow. Tests the full
 * flow from document upload through ZugFerd extraction using a real ZugFerd
 * invoice PDF.
 */
@QuarkusTest
@TestProfile(WireMockTestProfile.class)
@ConnectWireMock
class ZugFerdIT
{
	private static final String ZUGFERD_RESPONSE = """
		{
			"total": 1005.55,
			"currencyCode": "EUR",
			"date": "2024-01-15",
			"time": null,
			"documentId": "RE-2024-001",
			"merchantName": "Test Lieferant GmbH",
			"merchantAddress": {
				"name": "Test Lieferant GmbH",
				"countryOrRegion": "Germany",
				"postalCode": "12345",
				"state": null,
				"city": "Berlin",
				"street": "Musterstraße 1",
				"additionalAddress": null,
				"taxID": "DE123456789",
				"vatID": null,
				"description": null
			},
			"merchantTaxId": "DE123456789",
			"customerName": "Test Kunde",
			"customerId": null,
			"customerAddress": null,
			"billingAddress": null,
			"shippingAddress": null,
			"dueDate": "2024-02-15",
			"amountDue": 1005.55,
			"subTotal": 845.00,
			"totalTax": 160.55,
			"totalDiscount": null,
			"previousUnpaidBalance": null,
			"purchaseOrderNumber": null,
			"paymentTerm": null,
			"serviceStartDate": null,
			"serviceEndDate": null,
			"tags": []
		}
		""";

	WireMock wireMock;

	@Inject
	DocumentRepository documentRepository;

	@Inject
	StorageService storageService;

	@Inject
	DocumentProcessingWorkflow workflow;

	@Test
	void shouldExtractDataFromZugFerdInvoice() throws IOException
	{
		// Given - ZugFerd service returns extracted invoice data
		wireMock.register(post(urlEqualTo("/api/zugferd/document/scan"))
			.withHeader("Content-Type", containing("multipart/form-data"))
			.willReturn(aResponse()
				.withStatus(200)
				.withHeader("Content-Type", MediaType.APPLICATION_JSON)
				.withBody(ZUGFERD_RESPONSE)));

		Long documentId = createDocumentWithZugFerdPdf();

		// When - run the document analysis workflow
		WorkflowInstance instance = workflow.startProcessing(documentId);

		// Then - workflow should complete successfully
		assertThat(instance.getStatus(), is(WorkflowStatus.COMPLETED));

		// And - document should have extracted data
		Document document = findDocumentById(documentId);
		assertThat(document.getAnalysisStatus(), is(AnalysisStatus.COMPLETED));
		assertThat(document.getTotal(), equalTo(new BigDecimal("1005.55")));
		assertThat(document.getCurrencyCode(), equalTo("EUR"));
		assertThat(document.getInvoiceId(), equalTo("RE-2024-001"));
		assertThat(document.getSender(), is(notNullValue()));
		assertThat(document.getSender().getName(), equalTo("Test Lieferant GmbH"));
	}

	@Test
	void shouldFallbackToAiWhenZugFerdFails() throws IOException
	{
		// Given - ZugFerd service fails
		wireMock.register(post(urlEqualTo("/api/zugferd/document/scan"))
			.willReturn(aResponse()
				.withStatus(422)
				.withBody("Not a ZugFerd document")));

		// And - AI service is available as fallback
		String aiResponse = """
			{
				"total": 500.00,
				"currencyCode": "EUR",
				"date": "2024-01-20",
				"time": null,
				"documentId": "AI-EXTRACTED-001",
				"merchantName": "AI Detected Merchant",
				"merchantAddress": null,
				"merchantTaxId": null,
				"customerName": null,
				"customerId": null,
				"customerAddress": null,
				"billingAddress": null,
				"shippingAddress": null,
				"dueDate": null,
				"amountDue": null,
				"subTotal": null,
				"totalTax": null,
				"totalDiscount": null,
				"previousUnpaidBalance": null,
				"purchaseOrderNumber": null,
				"paymentTerm": null,
				"serviceStartDate": null,
				"serviceEndDate": null,
				"tags": ["rechnung", "lieferant"]
			}
			""";

		wireMock.register(post(urlEqualTo("/api/az-document-ai/document/scan"))
			.willReturn(aResponse()
				.withStatus(200)
				.withHeader("Content-Type", MediaType.APPLICATION_JSON)
				.withBody(aiResponse)));

		Long documentId = createDocumentWithZugFerdPdf();

		// When - run the document analysis workflow
		WorkflowInstance instance = workflow.startProcessing(documentId);

		// Then - workflow should complete (AI fallback worked)
		assertThat(instance.getStatus(), is(WorkflowStatus.COMPLETED));

		// And - document should have AI-extracted data
		Document document = findDocumentById(documentId);
		assertThat(document.getAnalysisStatus(), is(AnalysisStatus.COMPLETED));
		assertThat(document.getTotal(), equalTo(new BigDecimal("500.00")));
		assertThat(document.getInvoiceId(), equalTo("AI-EXTRACTED-001"));
		assertThat(document.getName(), equalTo("AI Detected Merchant"));
	}

	@Test
	void shouldSkipZugFerdForNonPdfFiles() throws IOException
	{
		// Given - AI service is available
		String aiResponse = """
			{
				"total": 250.00,
				"currencyCode": "EUR",
				"date": "2024-01-25",
				"time": null,
				"documentId": "IMG-001",
				"merchantName": "Image Receipt Merchant",
				"merchantAddress": null,
				"merchantTaxId": null,
				"customerName": null,
				"customerId": null,
				"customerAddress": null,
				"billingAddress": null,
				"shippingAddress": null,
				"dueDate": null,
				"amountDue": null,
				"subTotal": null,
				"totalTax": null,
				"totalDiscount": null,
				"previousUnpaidBalance": null,
				"purchaseOrderNumber": null,
				"paymentTerm": null,
				"serviceStartDate": null,
				"serviceEndDate": null,
				"tags": []
			}
			""";

		wireMock.register(post(urlEqualTo("/api/az-document-ai/document/scan"))
			.willReturn(aResponse()
				.withStatus(200)
				.withHeader("Content-Type", MediaType.APPLICATION_JSON)
				.withBody(aiResponse)));

		// Note: No ZugFerd stub needed - it should be skipped for non-PDF

		Long documentId = createDocumentWithImage();

		// When - run the document analysis workflow
		WorkflowInstance instance = workflow.startProcessing(documentId);

		// Then - workflow should complete successfully via AI
		assertThat(instance.getStatus(), is(WorkflowStatus.COMPLETED));

		// And - document should have AI-extracted data
		Document document = findDocumentById(documentId);
		assertThat(document.getAnalysisStatus(), is(AnalysisStatus.COMPLETED));
		assertThat(document.getTotal(), equalTo(new BigDecimal("250.00")));
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createDocumentWithZugFerdPdf() throws IOException
	{
		Document document = new Document();
		document.setName(null); // Will be filled by analysis
		document.setDocumentType(DocumentType.INVOICE);
		document.setCurrencyCode(null);
		document.setTotal(BigDecimal.ZERO);

		String fileKey = "test-zugferd/" + System.currentTimeMillis() + "/zugferd_invoice.pdf";
		document.setFileKey(fileKey);
		document.setFileName("zugferd_invoice.pdf");
		document.setFileContentType("application/pdf");

		// Upload real ZugFerd PDF to S3
		try (InputStream pdfStream = getClass().getResourceAsStream("/document/zugferd_invoice.pdf"))
		{
			assertThat("ZugFerd PDF test file must exist", pdfStream, is(notNullValue()));
			byte[] pdfBytes = pdfStream.readAllBytes();
			document.setFileSize((long)pdfBytes.length);
			storageService.uploadFile(fileKey, pdfBytes, "application/pdf");
		}

		documentRepository.persist(document);
		return document.getId();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createDocumentWithImage() throws IOException
	{
		Document document = new Document();
		document.setName(null);
		document.setDocumentType(DocumentType.RECEIPT);
		document.setCurrencyCode(null);
		document.setTotal(BigDecimal.ZERO);

		String fileKey = "test-image/" + System.currentTimeMillis() + "/receipt.png";
		document.setFileKey(fileKey);
		document.setFileName("receipt.png");
		document.setFileContentType("image/png");

		// Upload test image to S3
		try (InputStream imageStream = getClass().getResourceAsStream("/document/receipt.png"))
		{
			assertThat("Receipt PNG test file must exist", imageStream, is(notNullValue()));
			byte[] imageBytes = imageStream.readAllBytes();
			document.setFileSize((long)imageBytes.length);
			storageService.uploadFile(fileKey, imageBytes, "image/png");
		}

		documentRepository.persist(document);
		return document.getId();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Document findDocumentById(Long id)
	{
		Document doc = documentRepository.findById(id);
		// Force lazy loading
		if (doc.getSender() != null)
		{
			doc.getSender().getName();
		}
		org.hibernate.Hibernate.initialize(doc.getDocumentTags());
		return doc;
	}
}
