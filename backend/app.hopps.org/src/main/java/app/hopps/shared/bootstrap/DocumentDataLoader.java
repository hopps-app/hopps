package app.hopps.shared.bootstrap;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;

/**
 * Loads Document (Beleg) entities from testdata configuration. Documents represent uploaded receipts/invoices and back
 * the admin belegeCount and document-upload activity chart. Loaded after transactions (order=40) as they only reference
 * organizations.
 */
@ApplicationScoped
public class DocumentDataLoader implements EntityDataLoader<TestdataConfig.DocumentData> {

    private static final int ORDER = 50;

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

        // createdat is computed relative to now so the upload-activity month buckets are stable on any run date: the
        // 15th of the target month (current month minus monthsAgo), avoiding month-length drift near boundaries.
        String sql = """
                INSERT INTO document (id, organization_id, name, documentstatus, uploadedby, createdat)
                VALUES (:id, :organizationId, :name, 'UPLOADED', 'testdata@hopps.app',
                        date_trunc('month', NOW()) + INTERVAL '14 days' - (INTERVAL '1 month' * :monthsAgo))
                """;

        for (TestdataConfig.DocumentData document : config.getDocuments()) {
            entityManager.createNativeQuery(sql)
                    .setParameter("id", document.getId())
                    .setParameter("organizationId", document.getOrganizationId())
                    .setParameter("name", document.getName())
                    .setParameter("monthsAgo", document.getMonthsAgo())
                    .executeUpdate();

            Log.debugf("Loaded document: %s (id=%d)", document.getName(), document.getId());
        }
    }
}
