package app.fuggs.az.document.ai;

import com.azure.ai.documentintelligence.DocumentIntelligenceClient;
import com.azure.ai.documentintelligence.DocumentIntelligenceClientBuilder;
import com.azure.ai.documentintelligence.models.AnalyzeDocumentOptions;
import com.azure.ai.documentintelligence.models.AnalyzeResult;
import com.azure.core.credential.AzureKeyCredential;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@ApplicationScoped
public class AzureDocumentConnector
{
	private final DocumentIntelligenceClient azureClient;

	public AzureDocumentConnector(
		@ConfigProperty(name = "app.fuggs.az-document-ai.azure.endpoint") String endpoint,
		@ConfigProperty(name = "app.fuggs.az-document-ai.azure.key") String key)
	{
		azureClient = new DocumentIntelligenceClientBuilder()
			.credential(new AzureKeyCredential(key))
			.endpoint(endpoint)
			.buildClient();
	}

	public AnalyzeResult getAnalyzeResult(String modelId, Path image)
	{
		try
		{
			byte[] imageBytes = Files.readAllBytes(image);
			var options = new AnalyzeDocumentOptions(imageBytes);
			var analyzeDocumentPoller = azureClient.beginAnalyzeDocument(modelId, options);
			return analyzeDocumentPoller.getFinalResult();
		}
		catch (IOException e)
		{
			throw new RuntimeException("Failed to read document file: " + image, e);
		}
	}
}
