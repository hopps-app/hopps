package app.hopps.shared.bootstrap;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;

/**
 * Loads Document (receipt / "Beleg") entities from testdata configuration. Runs after transactions (order=45) so a
 * document can be linked to an existing transaction via {@code transaction.document_id}.
 * <p>
 * These test documents have no file stored in S3; the {@code /documents/{id}/file} endpoint returns 404 for them, which
 * the UI handles gracefully (no preview). They exist so the receipts view is populated and the bank-transaction
 * reconciliation can be exercised from the receipt-review drawer as well as the transaction detail drawer.
 */
@ApplicationScoped
public class DocumentDataLoader implements EntityDataLoader<TestdataConfig.DocumentData> {

    private static final int ORDER = 45;

    @Override
    public int getOrder() {
        return ORDER;
    }

    @Override
    public String getName() {
        return "Document";
    }

    @Override
    public void loadData(TestdataConfig config, EntityManager entityManager) {
        if (config.getDocuments() == null || config.getDocuments().isEmpty()) {
            Log.info("No documents to load");
            return;
        }

        Log.infof("Loading %d documents", config.getDocuments().size());

        String sql = """
                INSERT INTO document (id, organization_id, bommel_id, name, total, currencycode, transactiontime,
                                      privatelypaid, filename, filecontenttype, filesize, documentstatus,
                                      analysisstatus, direction, extractionsource, uploadedby, createdat, updatedat)
                VALUES (:id, :organizationId, :bommelId, :name, CAST(:total AS numeric), :currencyCode,
                        CAST(:transactionTime AS timestamp), false, :fileName, :fileContentType, :fileSize,
                        :documentStatus, :analysisStatus, :direction, :extractionSource, :uploadedBy, NOW(), NOW())
                """;

        for (TestdataConfig.DocumentData document : config.getDocuments()) {
            entityManager.createNativeQuery(sql)
                    .setParameter("id", document.getId())
                    .setParameter("organizationId", document.getOrganizationId())
                    .setParameter("bommelId", document.getBommelId())
                    .setParameter("name", document.getName())
                    .setParameter("total", document.getTotal())
                    .setParameter("currencyCode",
                            document.getCurrencyCode() != null ? document.getCurrencyCode() : "EUR")
                    .setParameter("transactionTime", document.getTransactionTime())
                    .setParameter("fileName", document.getFileName())
                    .setParameter("fileContentType",
                            document.getFileContentType() != null ? document.getFileContentType() : "application/pdf")
                    .setParameter("fileSize", document.getFileSize())
                    .setParameter("documentStatus",
                            document.getDocumentStatus() != null ? document.getDocumentStatus() : "CONFIRMED")
                    .setParameter("analysisStatus",
                            document.getAnalysisStatus() != null ? document.getAnalysisStatus() : "COMPLETED")
                    .setParameter("direction",
                            document.getDirection() != null ? document.getDirection() : "INCOMING")
                    .setParameter("extractionSource",
                            document.getExtractionSource() != null ? document.getExtractionSource() : "MANUAL")
                    .setParameter("uploadedBy",
                            document.getUploadedBy() != null ? document.getUploadedBy() : "testdata@hopps.app")
                    .executeUpdate();

            // Link the document to an existing transaction (transaction owns the FK) so it shows up as that
            // transaction's receipt and the reconciliation drawer is reachable from the receipt side too.
            if (document.getTransactionId() != null) {
                entityManager.createNativeQuery(
                        "UPDATE transaction SET document_id = :docId WHERE id = :txId")
                        .setParameter("docId", document.getId())
                        .setParameter("txId", document.getTransactionId())
                        .executeUpdate();
            }

            Log.debugf("Loaded document: %s (id=%d)", document.getName(), document.getId());
        }
    }
}
