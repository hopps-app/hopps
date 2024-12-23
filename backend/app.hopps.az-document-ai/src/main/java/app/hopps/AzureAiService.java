package app.hopps;

import app.hopps.commons.DocumentData;
import app.hopps.commons.InvoiceData;
import app.hopps.commons.ReceiptData;
import app.hopps.model.InvoiceDataHelper;
import app.hopps.model.ReceiptDataHelper;
import com.azure.ai.documentintelligence.models.AnalyzeResult;
import com.azure.ai.documentintelligence.models.Document;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URL;
import java.util.List;

@ApplicationScoped
public class AzureAiService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AzureAiService.class);

    private final AzureDocumentConnector azureDocumentConnector;

    @ConfigProperty(name = "app.hopps.az-document-ai.azure.invoiceModelId")
    String invoiceModelId;

    @ConfigProperty(name = "app.hopps.az-document-ai.azure.receiptModelId")
    String receiptModelId;

    @Inject
    public AzureAiService(AzureDocumentConnector azureDocumentConnector) {
        this.azureDocumentConnector = azureDocumentConnector;
    }

    public ReceiptData scanReceipt(DocumentData documentData) {
        Document document = scanDocument(receiptModelId, documentData.internalFinUrl());
        if (document == null) {
            return null;
        }

        return ReceiptDataHelper.fromDocument(documentData.referenceKey(), document);
    }

    public InvoiceData scanInvoice(DocumentData documentData) {
        Document document = scanDocument(invoiceModelId, documentData.internalFinUrl());
        if (document == null) {
            return null;
        }

        LOGGER.info("Scanned document: {}", document.getFields());

        return InvoiceDataHelper.fromDocument(documentData.referenceKey(), document);
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
