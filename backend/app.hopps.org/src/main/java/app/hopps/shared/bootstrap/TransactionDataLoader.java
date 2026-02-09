package app.hopps.shared.bootstrap;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;

/**
 * Loads Transaction entities from testdata configuration. Transactions are loaded after bommels (order=40) as they
 * reference organizations and bommels.
 */
@ApplicationScoped
public class TransactionDataLoader implements EntityDataLoader<TestdataConfig.TransactionData> {

    private static final int ORDER = 40;

    @Override
    public int getOrder() {
        return ORDER;
    }

    @Override
    public String getName() {
        return "Transaction";
    }

    @Override
    public void loadData(TestdataConfig config, EntityManager entityManager) {
        if (config.getTransactions() == null || config.getTransactions().isEmpty()) {
            Log.info("No transactions to load");
            return;
        }

        Log.infof("Loading %d transactions", config.getTransactions().size());

        // Start sender ID counter high enough to avoid conflicts
        long senderIdCounter = 1000;

        for (TestdataConfig.TransactionData transaction : config.getTransactions()) {
            // First, create a sender TradeParty if senderName is provided
            Long senderId = null;
            if (transaction.getSenderName() != null) {
                senderId = senderIdCounter++;
                String senderSql = """
                        INSERT INTO trade_party (id, name, organization_id)
                        VALUES (:id, :name, :organizationId)
                        """;

                entityManager.createNativeQuery(senderSql)
                        .setParameter("id", senderId)
                        .setParameter("name", transaction.getSenderName())
                        .setParameter("organizationId", transaction.getOrganizationId())
                        .executeUpdate();
            }

            // Then insert the transaction
            String sql = """
                    INSERT INTO transaction (id, organization_id, bommel_id, name, total, currencyCode,
                                            transaction_time, privately_paid, sender_id, status, created_by,
                                            created_at)
                    VALUES (:id, :organizationId, :bommelId, :name, CAST(:total AS numeric), :currencyCode,
                            CAST(:transactionTime AS timestamp), :privatelyPaid, :senderId,
                            :status, :createdBy, NOW())
                    """;

            entityManager.createNativeQuery(sql)
                    .setParameter("id", transaction.getId())
                    .setParameter("organizationId", transaction.getOrganizationId())
                    .setParameter("bommelId", transaction.getBommelId())
                    .setParameter("name", transaction.getName())
                    .setParameter("total", transaction.getTotal())
                    .setParameter("currencyCode", transaction.getCurrencyCode())
                    .setParameter("transactionTime", transaction.getTransactionTime())
                    .setParameter("privatelyPaid", transaction.getPrivatelyPaid())
                    .setParameter("senderId", senderId)
                    .setParameter("status", transaction.getStatus() != null ? transaction.getStatus() : "DRAFT")
                    .setParameter("createdBy",
                            transaction.getCreatedBy() != null ? transaction.getCreatedBy() : "testdata@hopps.app")
                    .executeUpdate();

            Log.debugf("Loaded transaction: %s (id=%d)", transaction.getName(), transaction.getId());
        }
    }
}
