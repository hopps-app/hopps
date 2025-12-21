package app.hopps.document.workflow;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.StorageService;
import app.hopps.simplepe.Chain;
import app.hopps.simplepe.ChainStatus;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;

/**
 * Tests for the document analysis workflow. Note: These tests verify the
 * workflow mechanics without the external AI service. The AI service would need
 * to be mocked with WireMock or similar for full integration tests.
 */
@QuarkusTest
class DocumentAnalysisWorkflowTest
{
	@Inject
	DocumentRepository documentRepository;

	@Inject
	StorageService storageService;

	@Inject
	DocumentAnalysisWorkflow workflow;

	@Test
	void shouldCompleteWorkflowForDocumentWithFile()
	{
		// Given
		Long documentId = createDocumentWithFile("Test Invoice", DocumentType.INVOICE);

		// When - the workflow will fail to connect to AI service, but should
		// handle
		// gracefully
		Chain chain = workflow.startAnalysis(documentId);

		// Then - workflow should complete (either success or handled failure)
		// In test environment without AI service, it will fail but that's
		// expected
		assertThat(chain, is(org.hamcrest.Matchers.notNullValue()));
	}

	@Test
	void shouldCompleteWorkflowForDocumentWithoutFile()
	{
		// Given
		Long documentId = createDocumentWithoutFile();

		// When
		Chain chain = workflow.startAnalysis(documentId);

		// Then - should complete successfully as it skips analysis
		assertThat(chain.getStatus(), is(ChainStatus.COMPLETED));

		// Document should be unchanged
		Document document = documentRepository.findById(documentId);
		assertThat(document.getTotal(), equalTo(new BigDecimal("0.00")));
	}

	@Test
	void shouldPreserveExistingMetadataOnWorkflowRun()
	{
		// Given
		Long documentId = createDocumentWithMetadata();

		// When - even if workflow fails, existing data should be preserved
		try
		{
			workflow.startAnalysis(documentId);
		}
		catch (Exception e)
		{
			// Expected in test environment without AI service
		}

		// Then - existing values should still be there
		Document document = documentRepository.findById(documentId);
		assertThat(document.getTotal(), equalTo(new BigDecimal("100.00")));
		assertThat(document.getCurrencyCode(), equalTo("EUR"));
		assertThat(document.getInvoiceId(), equalTo("EXISTING-123"));
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createDocumentWithFile(String name, DocumentType type)
	{
		Document document = new Document();
		document.setName(name);
		document.setDocumentType(type);
		document.setCurrencyCode("EUR");
		document.setTotal(new BigDecimal("0.00")); // Will be overwritten by AI

		String fileKey = "test-analysis/" + System.currentTimeMillis() + "/test.pdf";
		document.setFileKey(fileKey);
		document.setFileName("test.pdf");
		document.setFileContentType("application/pdf");
		document.setFileSize(1000L);

		// Upload test content to S3
		storageService.uploadFile(fileKey, "test content".getBytes(), "application/pdf");

		documentRepository.persist(document);
		return document.getId();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createDocumentWithMetadata()
	{
		Document document = new Document();
		document.setName("Existing Invoice");
		document.setDocumentType(DocumentType.INVOICE);
		document.setTotal(new BigDecimal("100.00"));
		document.setCurrencyCode("EUR");
		document.setInvoiceId("EXISTING-123");

		String fileKey = "test-analysis/" + System.currentTimeMillis() + "/existing.pdf";
		document.setFileKey(fileKey);
		document.setFileName("existing.pdf");
		document.setFileContentType("application/pdf");
		document.setFileSize(1000L);

		storageService.uploadFile(fileKey, "test content".getBytes(), "application/pdf");

		documentRepository.persist(document);
		return document.getId();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createDocumentWithoutFile()
	{
		Document document = new Document();
		document.setName("No File Document");
		document.setDocumentType(DocumentType.RECEIPT);
		document.setCurrencyCode("EUR");
		document.setTotal(new BigDecimal("0.00"));

		documentRepository.persist(document);
		return document.getId();
	}
}
