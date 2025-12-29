package app.hopps.document.workflow;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

import java.math.BigDecimal;

import org.hibernate.Hibernate;
import org.junit.jupiter.api.Test;

import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.domain.TagSource;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.shared.domain.Tag;
import app.hopps.document.service.StorageService;
import app.hopps.shared.repository.TagRepository;
import app.hopps.workflow.WorkflowInstance;
import app.hopps.workflow.WorkflowStatus;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;

/**
 * Tests for the document processing workflow. Note: These tests verify the
 * workflow mechanics without the external AI service. The AI service would need
 * to be mocked with WireMock or similar for full integration tests.
 */
@QuarkusTest
class DocumentProcessingWorkflowTest
{
	@Inject
	DocumentRepository documentRepository;

	@Inject
	StorageService storageService;

	@Inject
	TagRepository tagRepository;

	@Inject
	DocumentProcessingWorkflow workflow;

	@TestTransaction
	@Test
	void shouldCompleteWorkflowForDocumentWithFile()
	{
		Document document = new Document();
		document.setName("Test Invoice");
		document.setDocumentType(DocumentType.INVOICE);
		document.setCurrencyCode("EUR");
		document.setTotal(new BigDecimal("0.00"));

		String fileKey = "test-analysis/" + System.currentTimeMillis() + "/test.pdf";
		document.setFileKey(fileKey);
		document.setFileName("test.pdf");
		document.setFileContentType("application/pdf");
		document.setFileSize(1000L);

		storageService.uploadFile(fileKey, "test content".getBytes(), "application/pdf");
		documentRepository.persist(document);

		WorkflowInstance instance = workflow.startProcessing(document.getId());

		assertThat(instance, is(org.hamcrest.Matchers.notNullValue()));
	}

	@TestTransaction
	@Test
	void shouldCompleteWorkflowForDocumentWithoutFile()
	{
		Document document = new Document();
		document.setName("No File Document");
		document.setDocumentType(DocumentType.RECEIPT);
		document.setCurrencyCode("EUR");
		document.setTotal(new BigDecimal("0.00"));

		documentRepository.persist(document);

		WorkflowInstance instance = workflow.startProcessing(document.getId());

		assertThat(instance.getStatus(), is(WorkflowStatus.WAITING));
		assertThat(instance.isWaitingForUser(), is(true));

		Document found = documentRepository.findById(document.getId());
		assertThat(found.getTotal(), equalTo(new BigDecimal("0.00")));
	}

	@TestTransaction
	@Test
	void shouldPreserveExistingMetadataOnWorkflowRun()
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

		try
		{
			workflow.startProcessing(document.getId());
		}
		catch (Exception e)
		{
			// Expected in test environment without AI service
		}

		Document found = documentRepository.findById(document.getId());
		assertThat(found.getTotal(), equalTo(new BigDecimal("100.00")));
		assertThat(found.getCurrencyCode(), equalTo("EUR"));
		assertThat(found.getInvoiceId(), equalTo("EXISTING-123"));
	}

	@TestTransaction
	@Test
	void shouldNotOverwriteExistingTags()
	{
		Document document = new Document();
		document.setName("Document with Tags");
		document.setDocumentType(DocumentType.RECEIPT);
		document.setCurrencyCode("EUR");
		document.setTotal(new BigDecimal("50.00"));

		for (Tag tag : tagRepository.findOrCreateTags(java.util.Set.of("existing")))
		{
			document.addTag(tag, TagSource.MANUAL);
		}

		documentRepository.persist(document);

		WorkflowInstance instance = workflow.startProcessing(document.getId());

		assertThat(instance.getStatus(), is(WorkflowStatus.WAITING));
		assertThat(instance.isWaitingForUser(), is(true));

		Document found = documentRepository.findById(document.getId());
		Hibernate.initialize(found.getDocumentTags());

		assertThat(found.getDocumentTags(), hasSize(1));
	}
}
