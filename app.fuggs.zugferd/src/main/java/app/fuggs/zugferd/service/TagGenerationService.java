package app.fuggs.zugferd.service;

import java.util.Collections;
import java.util.List;

import org.mustangproject.Invoice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Service for generating AI-powered tags for ZugFerd invoices. Uses LangChain4j
 * and OpenAI GPT-4o-mini to generate German language tags.
 */
@ApplicationScoped
public class TagGenerationService
{
	private static final Logger LOG = LoggerFactory.getLogger(TagGenerationService.class);

	@Inject
	DocumentTagService documentTagService;

	@Inject
	ObjectMapper objectMapper;

	/**
	 * Generate tags for a ZugFerd invoice using AI. Returns empty list on
	 * failure to ensure graceful degradation.
	 *
	 * @param invoice
	 *            The ZugFerd invoice to generate tags for
	 * @return List of German language tags, or empty list on error
	 */
	public List<String> generateTagsForInvoice(Invoice invoice)
	{
		try
		{
			// Serialize invoice to JSON
			String invoiceJson = objectMapper.writeValueAsString(invoice);

			// Generate tags using AI service
			List<String> tags = documentTagService.generateTags(invoiceJson);

			LOG.info("Successfully generated {} tags for invoice", tags.size());
			return tags;
		}
		catch (JsonProcessingException e)
		{
			LOG.warn("Failed to serialize invoice to JSON for tag generation", e);
			return Collections.emptyList();
		}
		catch (Exception e)
		{
			LOG.warn("Failed to generate tags for invoice", e);
			return Collections.emptyList();
		}
	}
}
