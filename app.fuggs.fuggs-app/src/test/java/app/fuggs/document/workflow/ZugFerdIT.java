package app.fuggs.document.workflow;

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

import app.fuggs.document.client.WireMockTestProfile;
import app.fuggs.document.domain.AnalysisStatus;
import app.fuggs.document.domain.Document;
import app.fuggs.document.repository.DocumentRepository;
import app.fuggs.document.service.StorageService;
import app.fuggs.workflow.WorkflowInstance;
import app.fuggs.workflow.WorkflowStatus;
import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;

/**
 * Integration test for the ZugFerd document processing workflow. Tests the full
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

	@TestTransaction
	@Test
	void shouldExtractDataFromZugFerdInvoice() throws IOException
	{
		wireMock.register(post(urlEqualTo("/api/zugferd/document/scan"))
			.withHeader("Content-Type", containing("multipart/form-data"))
			.willReturn(aResponse()
				.withStatus(200)
				.withHeader("Content-Type", MediaType.APPLICATION_JSON)
				.withBody(ZUGFERD_RESPONSE)));

		Document document = new Document();
		document.setName(null);
		document.setCurrencyCode(null);
		document.setTotal(BigDecimal.ZERO);

		String fileKey = "test-zugferd/" + System.currentTimeMillis() + "/zugferd_invoice.pdf";
		document.setFileKey(fileKey);
		document.setFileName("zugferd_invoice.pdf");
		document.setFileContentType("application/pdf");

		try (InputStream pdfStream = getClass().getResourceAsStream("/document/zugferd_invoice.pdf"))
		{
			assertThat("ZugFerd PDF test file must exist", pdfStream, is(notNullValue()));
			byte[] pdfBytes = pdfStream.readAllBytes();
			document.setFileSize((long)pdfBytes.length);
			storageService.uploadFile(fileKey, pdfBytes, "application/pdf");
		}

		documentRepository.persist(document);

		WorkflowInstance instance = workflow.startProcessing(document.getId());

		assertThat(instance.getStatus(), is(WorkflowStatus.COMPLETED));

		Document found = documentRepository.findById(document.getId());
		assertThat(found.getAnalysisStatus(), is(AnalysisStatus.COMPLETED));
		assertThat(found.getTotal(), equalTo(new BigDecimal("1005.55")));
		assertThat(found.getCurrencyCode(), equalTo("EUR"));
		assertThat(found.getSender(), is(notNullValue()));
		assertThat(found.getSender().getName(), equalTo("Test Lieferant GmbH"));
	}

	@TestTransaction
	@Test
	void shouldFallbackToAiWhenZugFerdFails() throws IOException
	{
		wireMock.register(post(urlEqualTo("/api/zugferd/document/scan"))
			.willReturn(aResponse()
				.withStatus(422)
				.withBody("Not a ZugFerd document")));

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

		Document document = new Document();
		document.setName(null);
		document.setCurrencyCode(null);
		document.setTotal(BigDecimal.ZERO);

		String fileKey = "test-zugferd/" + System.currentTimeMillis() + "/zugferd_invoice.pdf";
		document.setFileKey(fileKey);
		document.setFileName("zugferd_invoice.pdf");
		document.setFileContentType("application/pdf");

		try (InputStream pdfStream = getClass().getResourceAsStream("/document/zugferd_invoice.pdf"))
		{
			assertThat("ZugFerd PDF test file must exist", pdfStream, is(notNullValue()));
			byte[] pdfBytes = pdfStream.readAllBytes();
			document.setFileSize((long)pdfBytes.length);
			storageService.uploadFile(fileKey, pdfBytes, "application/pdf");
		}

		documentRepository.persist(document);

		WorkflowInstance instance = workflow.startProcessing(document.getId());

		assertThat(instance.getStatus(), is(WorkflowStatus.COMPLETED));

		Document found = documentRepository.findById(document.getId());
		assertThat(found.getAnalysisStatus(), is(AnalysisStatus.COMPLETED));
		assertThat(found.getTotal(), equalTo(new BigDecimal("500.00")));
		assertThat(found.getName(), equalTo("AI Detected Merchant"));
	}

	@TestTransaction
	@Test
	void shouldSkipZugFerdForNonPdfFiles() throws IOException
	{
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

		Document document = new Document();
		document.setName(null);
		document.setCurrencyCode(null);
		document.setTotal(BigDecimal.ZERO);

		String fileKey = "test-image/" + System.currentTimeMillis() + "/receipt.png";
		document.setFileKey(fileKey);
		document.setFileName("receipt.png");
		document.setFileContentType("image/png");

		try (InputStream imageStream = getClass().getResourceAsStream("/document/receipt.png"))
		{
			assertThat("Receipt PNG test file must exist", imageStream, is(notNullValue()));
			byte[] imageBytes = imageStream.readAllBytes();
			document.setFileSize((long)imageBytes.length);
			storageService.uploadFile(fileKey, imageBytes, "image/png");
		}

		documentRepository.persist(document);

		WorkflowInstance instance = workflow.startProcessing(document.getId());

		assertThat(instance.getStatus(), is(WorkflowStatus.COMPLETED));

		Document found = documentRepository.findById(document.getId());
		assertThat(found.getAnalysisStatus(), is(AnalysisStatus.COMPLETED));
		assertThat(found.getTotal(), equalTo(new BigDecimal("250.00")));
	}
}
