package app.hopps;

import app.hopps.auth.FinRestClientImpl;
import app.hopps.commons.DocumentData;
import app.hopps.commons.InvoiceData;
import app.hopps.commons.ReceiptData;
import app.hopps.model.InvoiceDataHelper;
import app.hopps.model.ReceiptDataHelper;
import com.azure.ai.documentintelligence.models.AnalyzeResult;
import com.azure.ai.documentintelligence.models.Document;
import io.quarkus.oidc.client.OidcClient;
import io.quarkus.oidc.client.runtime.TokensHelper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URISyntaxException;
import java.net.URL;
import java.time.Duration;
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

    private final OidcClient oidcClient;
    private final TokensHelper tokensHelper = new TokensHelper();

    @Inject
    public AzureAiService(AzureDocumentConnector azureDocumentConnector, OidcClient oidcClient) {
        this.azureDocumentConnector = azureDocumentConnector;
        this.oidcClient = oidcClient;
    }

    public Optional<ReceiptData> scanReceipt(DocumentData documentData) {
        var document = scanDocument(receiptModelId, documentData.internalFinUrl());
        if (document.isEmpty()) {
            return Optional.empty();
        }

        LOG.info("Scanned receipt: {}", document.get().getFields());

        ReceiptData receiptData = ReceiptDataHelper.fromDocument(documentData.referenceKey(), document.get());
        return Optional.of(receiptData);
    }

    public Optional<InvoiceData> scanInvoice(DocumentData documentData) {
        var document = scanDocument(invoiceModelId, documentData.internalFinUrl());
        if (document.isEmpty()) {
            return Optional.empty();
        }

        LOG.info("Scanned invoice: {}", document.get().getFields());

        InvoiceData invoiceData = InvoiceDataHelper.fromDocument(documentData.referenceKey(), document.get());
        return Optional.of(invoiceData);
    }

    private Optional<Document> scanDocument(String modelId, URL documentUrl) {
        LOG.info("(model={}) Starting scan of document: '{}'", modelId, documentUrl);
        byte[] documentBytes = fetchDocument(documentUrl);

        AnalyzeResult analyzeLayoutResult = azureDocumentConnector.getAnalyzeResult(modelId, documentBytes);
        List<Document> documents = analyzeLayoutResult.getDocuments();

        if (documents.isEmpty()) {
            LOG.error("Couldn't analyze document '{}'", documentUrl);
            return Optional.empty();
        } else if (documents.size() > 1) {
            LOG.warn("Document analysis found {} documents, using first one", documents.size());
        }

        LOG.info("(model={}) Scan successfully completed for: '{}'", modelId, documentUrl);

        return Optional.ofNullable(documents.getFirst());
    }

    private byte[] fetchDocument(URL documentUrl) {
        try {
            FinRestClientImpl finRestClient = new FinRestClientImpl(documentUrl);
            String accessToken = tokensHelper.getTokens(oidcClient)
                    .await()
                    .atMost(Duration.ofSeconds(3))
                    .getAccessToken();

            return finRestClient.getDocumentBase64(accessToken);
        } catch (URISyntaxException e) {
            throw new IllegalStateException("Couldn't fetch document", e);
        }
    }
}
