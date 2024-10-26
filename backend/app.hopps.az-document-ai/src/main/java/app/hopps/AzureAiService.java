package app.hopps;

import app.hopps.model.InvoiceData;
import app.hopps.model.ReceiptData;
import com.azure.ai.documentintelligence.DocumentIntelligenceClient;
import com.azure.ai.documentintelligence.DocumentIntelligenceClientBuilder;
import com.azure.ai.documentintelligence.models.AnalyzeDocumentRequest;
import com.azure.ai.documentintelligence.models.AnalyzeResult;
import com.azure.ai.documentintelligence.models.AnalyzeResultOperation;
import com.azure.ai.documentintelligence.models.Document;
import com.azure.core.credential.AzureKeyCredential;
import com.azure.core.util.polling.SyncPoller;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URL;
import java.util.List;

@ApplicationScoped
public class AzureAiService {

    private final Logger LOGGER = LoggerFactory.getLogger(AzureAiService.class);

    @ConfigProperty(name = "app.hopps.az-document-ai.azure.invoiceModelId")
    String invoiceModelId;

    @ConfigProperty(name = "app.hopps.az-document-ai.azure.receiptModelId")
    String receiptModelId;

    @Inject
    AzureDocumentConnector azureDocumentConnector;

    public ReceiptData scanReceipt(URL imageUrl) {
        Document document = scanDocument(receiptModelId, imageUrl);
        if (document == null) {
            return null;
        }

        return ReceiptData.fromDocument(document);
    }

    public InvoiceData scanInvoice(URL imageUrl) {
        Document document = scanDocument(invoiceModelId, imageUrl);
        if (document == null) {
            return null;
        }

        LOGGER.info("Scanned document: {}", document.getFields());

        return InvoiceData.fromDocument(document);
    }

    private Document scanDocument(String modelId, URL imageUrl) {
        LOGGER.info("(model={}) Starting scan of document: '{}'", modelId, imageUrl);

        AnalyzeResult analyzeLayoutResult = azureDocumentConnector.getAnalyzeResult(modelId, imageUrl);
        List<Document> documents = analyzeLayoutResult.getDocuments();

        if (documents.isEmpty()) {
            LOGGER.error("Couldn't analyze document '{}'", imageUrl);
            return null;
        } else if (documents.size() > 1) {
            LOGGER.warn("Document analysis found {} documents, using first one", documents.size());
        }

        LOGGER.info("(model={}) Scan successfully completed for: '{}'", modelId, imageUrl);

        return documents.getFirst();
    }
}
