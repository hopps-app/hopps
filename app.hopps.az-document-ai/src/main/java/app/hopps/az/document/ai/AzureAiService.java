package app.hopps.az.document.ai;

import app.hopps.az.document.ai.model.DocumentData;
import app.hopps.az.document.ai.model.DocumentDataHelper;
import com.azure.ai.documentintelligence.models.AnalyzeResult;
import com.azure.ai.documentintelligence.models.AnalyzedDocument;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Path;
import java.util.List;

@ApplicationScoped
public class AzureAiService
{
	private static final Logger LOG = LoggerFactory.getLogger(AzureAiService.class);

	@Inject
	AzureDocumentConnector azureDocumentConnector;

	@Inject
	ObjectMapper objectMapper;

	@ConfigProperty(name = "app.hopps.az-document-ai.azure.modelId")
	String modelId;

	public DocumentData scanDocument(Path documentData, String documentName) throws OcrException
	{
		LOG.info("Starting scan of document: '{}'", documentName);

		AnalyzeResult analyzeLayoutResult = azureDocumentConnector.getAnalyzeResult(modelId, documentData);
		List<AnalyzedDocument> documents = analyzeLayoutResult.getDocuments();

		if (documents.isEmpty())
		{
			LOG.error("Couldn't analyze document '{}'", documentName);
			throw new OcrException("Could not analyze document, AI's return value is empty");
		}
		else if (documents.size() > 1)
		{
			LOG.warn("Document analysis for '{}' found {} documents, using first one", documentName, documents.size());
		}

		AnalyzedDocument document = documents.getFirst();
		LOG.info("Scanned document '{}': {}", documentName, document.getFields());

		try
		{
			System.out.println(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(document));
		}
		catch (JsonProcessingException e)
		{
			throw new RuntimeException(e);
		}

		return DocumentDataHelper.fromDocument(document);
	}
}