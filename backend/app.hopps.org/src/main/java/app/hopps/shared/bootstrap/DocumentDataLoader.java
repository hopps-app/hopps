package app.hopps.shared.bootstrap;

import app.hopps.bankimport.service.DedupeHashService;
import app.hopps.shared.infrastructure.storage.FileStorage;
import app.hopps.shared.infrastructure.storage.StorageKeys;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Optional;

/**
 * Loads Document (receipt / "Beleg") entities from testdata configuration. Runs after transactions (order=45) so a
 * document can be linked to an existing transaction via {@code transaction.document_id}.
 * <p>
 * By default these test documents have no stored file; the {@code /documents/{id}/file} endpoint returns 404 for them,
 * which the UI handles gracefully (no preview). In dev, {@code app.hopps.testdata.receipt-files} names a resource
 * folder with receipt PDFs matching the documents' values (made by demo-data/testdaten-belege/build_belege.py); a
 * document whose {@code fileName} is found there gets that file stored, so the preview shows a real receipt. They exist
 * so the receipts view is populated and the bank-transaction reconciliation can be exercised from the receipt-review
 * drawer as well as the transaction detail drawer.
 * <p>
 * {@code createdat} is computed relative to now from {@code monthsAgo} so the admin dashboard's upload-activity month
 * buckets are stable on any run date: the 15th of the target month (current month minus monthsAgo), avoiding
 * month-length drift near boundaries. Entries without {@code monthsAgo} default to the current month.
 */
@ApplicationScoped
public class DocumentDataLoader implements EntityDataLoader<TestdataConfig.DocumentData> {

    private static final int ORDER = 45;
    private static final long SENDER_ID_BASE = 3000;
    private static final String PDF = "application/pdf";

    @ConfigProperty(name = "app.hopps.testdata.receipt-files")
    Optional<String> receiptFiles;

    @Inject
    Instance<FileStorage> fileStorage;

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
                                      analysisstatus, direction, extractionsource, uploadedby, createdat, updatedat,
                                      sender_id)
                VALUES (:id, :organizationId, :bommelId, :name, CAST(:total AS numeric), :currencyCode,
                        CAST(:transactionTime AS timestamp), :privatelyPaid, :fileName, :fileContentType, :fileSize,
                        :documentStatus, :analysisStatus, :direction, :extractionSource, :uploadedBy,
                        date_trunc('month', NOW()) + INTERVAL '14 days' - (INTERVAL '1 month' * :monthsAgo),
                        date_trunc('month', NOW()) + INTERVAL '14 days' - (INTERVAL '1 month' * :monthsAgo),
                        :senderId)
                """;

        // Counterparties of the documents; ids kept clear of the ones the transaction loader hands out (1000+).
        long senderIdCounter = SENDER_ID_BASE;

        for (TestdataConfig.DocumentData document : config.getDocuments()) {
            Long senderId = null;
            if (document.getSenderName() != null) {
                senderId = senderIdCounter++;
                entityManager.createNativeQuery(
                        "INSERT INTO trade_party (id, name, organization_id) VALUES (:id, :name, :organizationId)")
                        .setParameter("id", senderId)
                        .setParameter("name", document.getSenderName())
                        .setParameter("organizationId", document.getOrganizationId())
                        .executeUpdate();
            }

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
                    .setParameter("monthsAgo", document.getMonthsAgo() != null ? document.getMonthsAgo() : 0L)
                    .setParameter("privatelyPaid", Boolean.TRUE.equals(document.getPrivatelyPaid()))
                    .setParameter("senderId", senderId)
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
            // A split receipt: several transactions booked from it, in part order.
            if (document.getTransactionIds() != null) {
                for (Long transactionId : document.getTransactionIds()) {
                    entityManager.createNativeQuery(
                            "UPDATE transaction SET document_id = :docId WHERE id = :txId")
                            .setParameter("docId", document.getId())
                            .setParameter("txId", transactionId)
                            .executeUpdate();
                }
            }

            attachReceiptFile(document, entityManager);

            Log.debugf("Loaded document: %s (id=%d)", document.getName(), document.getId());
        }
    }

    /** Stores the receipt PDF of the document from the receipt-files folder, if there is one for its file name. */
    private void attachReceiptFile(TestdataConfig.DocumentData document, EntityManager entityManager) {
        if (receiptFiles.isEmpty() || document.getFileName() == null) {
            return;
        }
        String resource = receiptFiles.get() + "/" + document.getFileName();
        byte[] bytes;
        try (InputStream in = Thread.currentThread().getContextClassLoader().getResourceAsStream(resource)) {
            if (in == null) {
                return;
            }
            bytes = in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read receipt file " + resource, e);
        }

        String fileKey = "documents/testdata-" + document.getId() + "/"
                + StorageKeys.sanitizeFileName(document.getFileName(), "beleg.pdf");
        fileStorage.get().put(fileKey, bytes, PDF);
        entityManager.createNativeQuery("""
                UPDATE document SET filekey = :fileKey, filecontenttype = :contentType, filesize = :fileSize,
                                    filehash = :fileHash
                WHERE id = :id
                """)
                .setParameter("fileKey", fileKey)
                .setParameter("contentType", PDF)
                .setParameter("fileSize", (long) bytes.length)
                .setParameter("fileHash", DedupeHashService.sha256(bytes))
                .setParameter("id", document.getId())
                .executeUpdate();
    }
}
