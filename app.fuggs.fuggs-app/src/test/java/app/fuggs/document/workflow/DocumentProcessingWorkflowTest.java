package app.fuggs.document.workflow;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

import java.math.BigDecimal;

import org.hibernate.Hibernate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import app.fuggs.document.domain.Document;
import app.fuggs.document.domain.TagSource;
import app.fuggs.document.repository.DocumentRepository;
import app.fuggs.shared.domain.Tag;
import app.fuggs.document.service.StorageService;
import app.fuggs.shared.repository.TagRepository;
import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.BaseOrganizationTest;
import app.fuggs.shared.TestSecurityHelper;
import app.fuggs.workflow.WorkflowInstance;
import app.fuggs.workflow.WorkflowStatus;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;

/**
 * Tests for the document processing workflow. Note: These tests verify the
 * workflow mechanics without the external AI service. The AI service would need
 * to be mocked with WireMock or similar for full integration tests.
 */
@QuarkusTest
@TestSecurity(user = TestSecurityHelper.TEST_USER_MARIA, roles = "user")
class DocumentProcessingWorkflowTest extends BaseOrganizationTest
{
	@BeforeEach
	void setupOrganizationContext()
	{
		Organization testOrg = getOrCreateTestOrganization();
		createTestMember(TestSecurityHelper.TEST_USER_MARIA, testOrg);
	}

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
		Organization organization = getOrCreateTestOrganization();

		Document document = new Document();
		document.setName("Test Invoice");
		document.setCurrencyCode("EUR");
		document.setTotal(new BigDecimal("0.00"));
		document.setOrganization(organization);

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
		Organization organization = getOrCreateTestOrganization();

		Document document = new Document();
		document.setName("No File Document");
		document.setCurrencyCode("EUR");
		document.setTotal(new BigDecimal("0.00"));
		document.setOrganization(organization);

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
		Organization organization = getOrCreateTestOrganization();

		Document document = new Document();
		document.setName("Existing Invoice");
		document.setTotal(new BigDecimal("100.00"));
		document.setCurrencyCode("EUR");
		document.setOrganization(organization);

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
	}

	@TestTransaction
	@Test
	void shouldNotOverwriteExistingTags()
	{
		Organization organization = getOrCreateTestOrganization();

		Document document = new Document();
		document.setName("Document with Tags");
		document.setCurrencyCode("EUR");
		document.setTotal(new BigDecimal("50.00"));
		document.setOrganization(organization);

		for (Tag tag : createTags(java.util.Set.of("existing"), organization))
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
