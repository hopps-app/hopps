package app.hopps.shared.bootstrap;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;

/**
 * Loads BankAccount entities from testdata configuration (order=50). For every account a single seed
 * {@link app.hopps.bankimport.domain.BankImport} is created (same id as the account) because bank transactions require
 * a non-null import FK; {@link BankTransactionDataLoader} looks that import up per account.
 */
@ApplicationScoped
public class BankAccountDataLoader implements EntityDataLoader<TestdataConfig.BankAccountData> {

    private static final int ORDER = 50;

    @Override
    public int getOrder() {
        return ORDER;
    }

    @Override
    public String getName() {
        return "BankAccount";
    }

    @Override
    public void loadData(TestdataConfig config, EntityManager entityManager) {
        if (config.getBankAccounts() == null || config.getBankAccounts().isEmpty()) {
            Log.info("No bank accounts to load");
            return;
        }

        Log.infof("Loading %d bank accounts", config.getBankAccounts().size());

        String accountSql = """
                INSERT INTO BankAccount (id, organization_id, bommel_id, name, iban, bic, bankName, accountHolder,
                                         currency, openingBalance, openingBalanceDate, description, color, archived,
                                         createdBy, createdAt)
                VALUES (:id, :organizationId, :bommelId, :name, :iban, :bic, :bankName, :accountHolder, :currency,
                        CAST(:openingBalance AS numeric), CAST(:openingBalanceDate AS date), :description, :color,
                        false, :createdBy, NOW())
                """;

        // Seed import per account (id = account id). schema_id is nullable since the MT940 migration; file_type CSV.
        String importSql = """
                INSERT INTO BankImport (id, organization_id, bankAccount_id, schema_id, fileName, fileSize,
                                        fileSha256, importedBy, importedAt, startedAt, finishedAt, status, progress,
                                        totalRows, importedRows, duplicateRows, errorRows, file_type)
                VALUES (:id, :organizationId, :bankAccountId, NULL, :fileName, 0, :sha, :importedBy, NOW(), NOW(),
                        NOW(), 'COMPLETED', 100, 0, 0, 0, 0, 'CSV')
                """;

        for (TestdataConfig.BankAccountData account : config.getBankAccounts()) {
            String createdBy = account.getCreatedBy() != null ? account.getCreatedBy() : "testdata@hopps.app";

            entityManager.createNativeQuery(accountSql)
                    .setParameter("id", account.getId())
                    .setParameter("organizationId", account.getOrganizationId())
                    .setParameter("bommelId", account.getBommelId())
                    .setParameter("name", account.getName())
                    .setParameter("iban", account.getIban())
                    .setParameter("bic", account.getBic())
                    .setParameter("bankName", account.getBankName())
                    .setParameter("accountHolder", account.getAccountHolder())
                    .setParameter("currency", account.getCurrency() != null ? account.getCurrency() : "EUR")
                    .setParameter("openingBalance", account.getOpeningBalance())
                    .setParameter("openingBalanceDate", account.getOpeningBalanceDate())
                    .setParameter("description", account.getDescription())
                    .setParameter("color", account.getColor())
                    .setParameter("createdBy", createdBy)
                    .executeUpdate();

            entityManager.createNativeQuery(importSql)
                    .setParameter("id", account.getId())
                    .setParameter("organizationId", account.getOrganizationId())
                    .setParameter("bankAccountId", account.getId())
                    .setParameter("fileName", "testdata-seed.csv")
                    .setParameter("sha", "testdata-seed-" + account.getId())
                    .setParameter("importedBy", createdBy)
                    .executeUpdate();

            Log.debugf("Loaded bank account: %s (id=%d) with seed import", account.getName(), account.getId());
        }
    }
}
