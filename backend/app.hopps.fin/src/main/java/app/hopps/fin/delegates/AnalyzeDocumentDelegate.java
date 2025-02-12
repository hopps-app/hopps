package app.hopps.fin.delegates;

import app.hopps.commons.Data;
import app.hopps.commons.DocumentType;
import app.hopps.fin.S3Handler;
import app.hopps.fin.client.DocumentAnalyzeClient;
import app.hopps.fin.jpa.TransactionRecordRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;

@ApplicationScoped
public class AnalyzeDocumentDelegate {

    @Inject
    @RestClient
    DocumentAnalyzeClient analyzeClient;

    @Inject
    TransactionRecordRepository transactionRecordRepository;

    @Inject
    S3Handler s3Handler;

    public Data analyzeDocument(DocumentType type, long transactionRecordId) {
        var record = transactionRecordRepository.findById(transactionRecordId);
        if (record == null) {
            throw new IllegalArgumentException("Invalid transaction record id: " + transactionRecordId);
        }

        var document = s3Handler.getFile(record.getDocumentKey());

        return switch (type) {
            case INVOICE -> analyzeClient.scanInvoice(document, transactionRecordId);
            case RECEIPT -> analyzeClient.scanReceipt(document, transactionRecordId);
        };
    }
}
