package app.hopps.document.workflow;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.domain.TagSource;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.DocumentTagService;
import app.hopps.shared.domain.Tag;
import app.hopps.shared.repository.TagRepository;
import app.hopps.simplepe.Chain;
import app.hopps.simplepe.TaskResult;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;

@QuarkusTest
class GenerateTagsTaskTest
{
	@Inject
	GenerateTagsTask task;

	@InjectMock
	DocumentRepository documentRepository;

	@InjectMock
	TagRepository tagRepository;

	@InjectMock
	DocumentTagService documentTagService;

	private Chain chain;

	@BeforeEach
	void setUp()
	{
		chain = new Chain("test-chain");
	}

	@Test
	void shouldReturnCorrectTaskName()
	{
		assertThat(task.getTaskName(), equalTo("GenerateTags"));
	}

	@Test
	void shouldFailWhenDocumentIdNotSet()
	{
		// Given - no document ID in chain

		// When/Then
		TaskResult result = task.execute(chain);

		assertThat(result, is(TaskResult.FAILED));
		assertThat(chain.getError(), equalTo("Document ID not set in chain"));
	}

	@Test
	void shouldFailWhenDocumentNotFound()
	{
		// Given
		chain.setVariable(AnalyzeDocumentTask.VAR_DOCUMENT_ID, 999L);
		when(documentRepository.findById(999L)).thenReturn(null);

		// When
		TaskResult result = task.execute(chain);

		// Then
		assertThat(result, is(TaskResult.FAILED));
		assertThat(chain.getError(), equalTo("Document not found: 999"));
	}

	@Test
	void shouldSkipWhenDocumentAlreadyHasTags()
	{
		// Given
		Document document = createDocument(1L);
		document.addTag(new Tag("existing"), TagSource.MANUAL);

		chain.setVariable(AnalyzeDocumentTask.VAR_DOCUMENT_ID, 1L);
		when(documentRepository.findById(1L)).thenReturn(document);

		// When
		TaskResult result = task.execute(chain);

		// Then
		assertThat(result, is(TaskResult.COMPLETED));
		verify(documentTagService, never()).tagDocument(Mockito.any());
	}

	@Test
	void shouldGenerateAndAssignTags()
	{
		// Given
		Document document = createDocument(1L);
		chain.setVariable(AnalyzeDocumentTask.VAR_DOCUMENT_ID, 1L);
		when(documentRepository.findById(1L)).thenReturn(document);
		when(documentTagService.tagDocument(document)).thenReturn(List.of("food", "pizza"));

		Tag foodTag = new Tag("food");
		Tag pizzaTag = new Tag("pizza");
		when(tagRepository.findOrCreateTags(Set.of("food", "pizza")))
			.thenReturn(Set.of(foodTag, pizzaTag));

		// When
		TaskResult result = task.execute(chain);

		// Then
		assertThat(result, is(TaskResult.COMPLETED));
		assertThat(document.getDocumentTags(), hasSize(2));
	}

	@Test
	void shouldHandleNullTagsFromService()
	{
		// Given
		Document document = createDocument(1L);
		chain.setVariable(AnalyzeDocumentTask.VAR_DOCUMENT_ID, 1L);
		when(documentRepository.findById(1L)).thenReturn(document);
		when(documentTagService.tagDocument(document)).thenReturn(null);

		// When
		TaskResult result = task.execute(chain);

		// Then
		assertThat(result, is(TaskResult.COMPLETED));
		assertThat(document.getDocumentTags(), hasSize(0));
		verify(tagRepository, never()).findOrCreateTags(Mockito.any());
	}

	@Test
	void shouldHandleEmptyTagsFromService()
	{
		// Given
		Document document = createDocument(1L);
		chain.setVariable(AnalyzeDocumentTask.VAR_DOCUMENT_ID, 1L);
		when(documentRepository.findById(1L)).thenReturn(document);
		when(documentTagService.tagDocument(document)).thenReturn(List.of());

		// When
		TaskResult result = task.execute(chain);

		// Then
		assertThat(result, is(TaskResult.COMPLETED));
		assertThat(document.getDocumentTags(), hasSize(0));
		verify(tagRepository, never()).findOrCreateTags(Mockito.any());
	}

	@Test
	void shouldHandleExceptionFromTagServiceGracefully()
	{
		// Given
		Document document = createDocument(1L);
		chain.setVariable(AnalyzeDocumentTask.VAR_DOCUMENT_ID, 1L);
		when(documentRepository.findById(1L)).thenReturn(document);
		when(documentTagService.tagDocument(document))
			.thenThrow(new RuntimeException("AI service unavailable"));

		// When
		TaskResult result = task.execute(chain);

		// Then - should complete successfully despite error (tags are optional)
		assertThat(result, is(TaskResult.COMPLETED));
		assertThat(document.getDocumentTags(), hasSize(0));
	}

	private Document createDocument(Long id)
	{
		Document document = new Document();
		document.setName("Test Document");
		document.setDocumentType(DocumentType.RECEIPT);
		document.setTotal(new BigDecimal("10.00"));
		document.setCurrencyCode("EUR");
		// Use reflection to set ID for testing
		try
		{
			var idField = document.getClass().getSuperclass().getDeclaredField("id");
			idField.setAccessible(true);
			idField.set(document, id);
		}
		catch (Exception e)
		{
			throw new RuntimeException("Failed to set document ID", e);
		}
		return document;
	}
}
