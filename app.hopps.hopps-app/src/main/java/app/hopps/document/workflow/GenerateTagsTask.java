package app.hopps.document.workflow;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.document.domain.Document;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.DocumentTagService;
import app.hopps.shared.domain.Tag;
import app.hopps.shared.repository.TagRepository;
import app.hopps.simplepe.Chain;
import app.hopps.simplepe.SystemTask;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Generates tags for a document using AI-powered tag analysis.
 */
@ApplicationScoped
public class GenerateTagsTask extends SystemTask
{
	private static final Logger LOG = LoggerFactory.getLogger(GenerateTagsTask.class);

	@Inject
	DocumentRepository documentRepository;

	@Inject
	TagRepository tagRepository;

	@Inject
	DocumentTagService documentTagService;

	@Override
	public String getTaskName()
	{
		return "GenerateTags";
	}

	@Override
	@Transactional
	protected void doExecute(Chain chain)
	{
		Long documentId = chain.getVariable(AnalyzeDocumentTask.VAR_DOCUMENT_ID, Long.class);
		if (documentId == null)
		{
			LOG.error("Document ID not set in chain: {}", chain.getId());
			throw new IllegalStateException("Document ID not set in chain");
		}

		Document document = documentRepository.findById(documentId);
		if (document == null)
		{
			LOG.error("Document not found: id={}", documentId);
			throw new IllegalStateException("Document not found: " + documentId);
		}

		// Skip if document already has tags
		if (!document.getTags().isEmpty())
		{
			LOG.info("Document already has tags, skipping generation: id={}", documentId);
			return;
		}

		LOG.info("Generating tags for document: id={}, name={}", documentId, document.getDisplayName());

		try
		{
			List<String> tagNames = documentTagService.tagDocument(document);

			if (tagNames == null || tagNames.isEmpty())
			{
				LOG.info("No tags generated for document: id={}", documentId);
				return;
			}

			// Convert tag names to Tag entities (reusing existing tags)
			Set<Tag> tags = tagRepository.findOrCreateTags(new HashSet<>(tagNames));
			document.setTags(tags);

			LOG.info("Generated {} tags for document: id={}, tags={}",
				tags.size(), documentId, tagNames);
		}
		catch (Exception e)
		{
			LOG.warn("Failed to generate tags for document: id={}, error={}",
				documentId, e.getMessage());
			// Don't fail the workflow - tags are optional
		}
	}
}
