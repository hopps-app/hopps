package app.hopps;

import com.azure.ai.documentintelligence.DocumentIntelligenceClient;
import com.azure.ai.documentintelligence.DocumentIntelligenceClientBuilder;
import com.azure.ai.documentintelligence.models.AnalyzeDocumentRequest;
import com.azure.ai.documentintelligence.models.AnalyzeResult;
import com.azure.ai.documentintelligence.models.AnalyzeResultOperation;
import com.azure.core.credential.AzureKeyCredential;
import com.azure.core.util.polling.SyncPoller;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.net.URL;

@ApplicationScoped
public class AzureDocumentConnector {

    private final DocumentIntelligenceClient azureClient;

    public AzureDocumentConnector(
            @ConfigProperty(name = "app.hopps.az-document-ai.azure.endpoint") String endpoint,
            @ConfigProperty(name = "app.hopps.az-document-ai.azure.key") String key) {
        azureClient = new DocumentIntelligenceClientBuilder()
                .credential(new AzureKeyCredential(key))
                .endpoint(endpoint)
                .buildClient();
    }

    public AnalyzeResult getAnalyzeResult(String modelId, URL imageUrl) {
        SyncPoller<AnalyzeResultOperation, AnalyzeResult> analyzeLayoutPoller = azureClient.beginAnalyzeDocument(
                modelId,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                new AnalyzeDocumentRequest().setUrlSource(imageUrl.toString()));

        return analyzeLayoutPoller.getFinalResult();
    }
}
