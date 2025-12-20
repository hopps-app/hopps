package app.hopps.az.document.ai;

import com.azure.ai.documentintelligence.DocumentIntelligenceClient;
import com.azure.ai.documentintelligence.DocumentIntelligenceClientBuilder;
import com.azure.ai.documentintelligence.models.AnalyzeDocumentOptions;
import com.azure.ai.documentintelligence.models.AnalyzeResult;
import com.azure.core.credential.AzureKeyCredential;
import com.azure.core.util.BinaryData;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.file.Path;

@ApplicationScoped
public class AzureDocumentConnector
{
	private final DocumentIntelligenceClient azureClient;

	public AzureDocumentConnector(
		@ConfigProperty(name = "app.hopps.az-document-ai.azure.endpoint") String endpoint,
		@ConfigProperty(name = "app.hopps.az-document-ai.azure.key") String key)
	{
		azureClient = new DocumentIntelligenceClientBuilder()
			.credential(new AzureKeyCredential(key))
			.endpoint(endpoint)
			.buildClient();
	}

	public AnalyzeResult getAnalyzeResult(String modelId, Path image)
	{
		BinaryData imageData = BinaryData.fromFile(image);

		var analyzeDocumentPoller = azureClient.beginAnalyzeDocument(modelId, new AnalyzeDocumentOptions(imageData));

		return analyzeDocumentPoller.getFinalResult();
	}
}
