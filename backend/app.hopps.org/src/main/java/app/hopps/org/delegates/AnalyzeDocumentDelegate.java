package app.hopps.org.delegates;

import app.hopps.commons.Data;
import app.hopps.commons.DocumentType;
import app.hopps.org.services.AnalyzeDocumentRequest;
import app.hopps.org.services.DocumentAnalyzeClient;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.kie.kogito.internal.process.runtime.KogitoProcessInstance;

@ApplicationScoped
public class AnalyzeDocumentDelegate {

    @Inject
    DocumentAnalyzeClient analyzeClient;

    public Data analyzeDocument(DocumentType type, KogitoProcessInstance instance) {
        instance.getVariables().get("");

        // TODO: get url of the document here
        var body = new AnalyzeDocumentRequest("REPLACE ME");

        return switch (type) {
            case INVOICE -> analyzeClient.scanInvoice(body);
            case RECEIPT -> analyzeClient.scanReceipt(body);
        };
    }

}
