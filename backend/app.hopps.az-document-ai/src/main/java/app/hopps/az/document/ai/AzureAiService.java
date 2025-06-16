package app.hopps.az.document.ai;

import app.hopps.az.document.ai.model.InvoiceData;
import app.hopps.az.document.ai.model.InvoiceDataHelper;
import app.hopps.az.document.ai.model.ReceiptData;
import app.hopps.az.document.ai.model.ReceiptDataHelper;
import com.azure.ai.documentintelligence.models.AnalyzeResult;
import com.azure.ai.documentintelligence.models.AnalyzedDocument;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class AzureAiService {

    private static final Logger LOG = LoggerFactory.getLogger(AzureAiService.class);

    private final AzureDocumentConnector azureDocumentConnector;

    @ConfigProperty(name = "app.hopps.az-document-ai.azure.invoiceModelId")
    String invoiceModelId;

    @ConfigProperty(name = "app.hopps.az-document-ai.azure.receiptModelId")
    String receiptModelId;

    @Inject
    public AzureAiService(AzureDocumentConnector azureDocumentConnector) {
        this.azureDocumentConnector = azureDocumentConnector;
    }

    public Optional<ReceiptData> scanReceipt(Path documentData, String documentName) {
        var document = scanDocument(receiptModelId, documentData, documentName);
        if (document.isEmpty()) {
            return Optional.empty();
        }

        ReceiptData receiptData = ReceiptDataHelper.fromDocument(document.get());
        return Optional.of(receiptData);
    }

    public Optional<InvoiceData> scanInvoice(Path documentData, String documentName) {
        var document = scanDocument(invoiceModelId, documentData, documentName);
        if (document.isEmpty()) {
            return Optional.empty();
        }

        InvoiceData invoiceData = InvoiceDataHelper.fromDocument(document.get());
        return Optional.of(invoiceData);
    }

    private Optional<AnalyzedDocument> scanDocument(String modelId, Path document, String documentName) {
        LOG.info("(model={}) Starting scan of document: '{}'", modelId, documentName);

        AnalyzeResult analyzeLayoutResult = azureDocumentConnector.getAnalyzeResult(modelId, document);
        List<AnalyzedDocument> documents = analyzeLayoutResult.getDocuments();

        if (documents.isEmpty()) {
            LOG.error("Couldn't analyze document '{}'", documentName);
            return Optional.empty();
        } else if (documents.size() > 1) {
            LOG.warn("Document analysis for '{}' found {} documents, using first one", documentName, documents.size());
        }

        LOG.info("(model={}) Scan successfully completed for: '{}'", modelId, documentName);

        return Optional.ofNullable(documents.getFirst());
    }
}
