package app.hopps.az.document.ai;

import app.hopps.az.document.ai.model.DocumentData;
import app.hopps.az.document.ai.model.DocumentDataHelper;
import app.hopps.az.document.ai.service.DocumentTagService;
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
import java.util.Collections;
import java.util.List;

@ApplicationScoped
public class AzureAiService {
    private static final Logger LOG = LoggerFactory.getLogger(AzureAiService.class);

    @Inject
    AzureDocumentConnector azureDocumentConnector;

    @Inject
    DocumentTagService documentTagService;

    @Inject
    ObjectMapper objectMapper;

    @ConfigProperty(name = "app.hopps.az-document-ai.azure.modelId")
    String modelId;

    public DocumentData scanDocument(Path documentData, String documentName) throws OcrException {
        LOG.info("Starting scan of document: '{}'", documentName);

        AnalyzeResult analyzeLayoutResult = azureDocumentConnector.getAnalyzeResult(modelId, documentData);
        List<AnalyzedDocument> documents = analyzeLayoutResult.getDocuments();

        if (documents.isEmpty()) {
            LOG.error("Couldn't analyze document '{}'", documentName);
            throw new OcrException("Could not analyze document, AI's return value is empty");
        } else if (documents.size() > 1) {
            LOG.warn("Document analysis for '{}' found {} documents, using first one", documentName, documents.size());
        }

        AnalyzedDocument document = documents.getFirst();
        LOG.info("Scanned document '{}': docType={}, fields={}", documentName, document.getDocumentType(),
                document.getFields().keySet());

        List<String> tags = generateTags(document, documentName);

        return DocumentDataHelper.fromDocument(document, tags);
    }

    private List<String> generateTags(AnalyzedDocument document, String documentName) throws OcrException {
        try {
            String documentJson = objectMapper.writeValueAsString(document);
            LOG.debug("Generating tags for document '{}', JSON length: {}", documentName, documentJson.length());

            List<String> tags = documentTagService.generateTags(documentJson);

            if (tags != null && !tags.isEmpty()) {
                LOG.info("Generated {} tags for document '{}': {}", tags.size(), documentName, tags);
                return tags;
            } else {
                LOG.info("No tags generated for document '{}'", documentName);
                return Collections.emptyList();
            }
        } catch (JsonProcessingException e) {
            LOG.warn("Failed to serialize document for tag generation: {}", e.getMessage());
            return Collections.emptyList();
        } catch (Exception e) {
            if (isQuotaExceededError(e)) {
                LOG.error("AI service quota exceeded during tag generation for document '{}': {}", documentName,
                        e.getMessage());
                throw new OcrException("AI service quota exceeded. Please check your OpenAI plan and billing details.");
            }
            LOG.warn("Failed to generate tags for document '{}': {}", documentName, e.getMessage());
            return Collections.emptyList();
        }
    }

    private boolean isQuotaExceededError(Throwable e) {
        // Check the full exception chain for quota-related error messages
        Throwable current = e;
        while (current != null) {
            String message = current.getMessage();
            if (message != null
                    && (message.contains("insufficient_quota") || message.contains("exceeded your current quota")
                            || message.contains("rate_limit_exceeded"))) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
