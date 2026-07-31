package app.hopps.shared.bootstrap;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;

import java.util.HashMap;
import java.util.Map;

/**
 * Loads BankTransaction entities from testdata configuration (order=60, after bank accounts). Each transaction is
 * attached to the seed import of its bank account.
 * <p>
 * In addition to the explicit rows from the YAML, a batch of "noise" transactions whose purpose text contains
 * {@code 450,00} is generated for the first bank account. Together with the explicit exact 450,00 match this pushes the
 * "450,00" search result set past the picker's 25-row page, so the amount-prioritized ordering can be observed: without
 * it the single exact match (booked earliest) would be sorted to the bottom and fall off the page.
 */
@ApplicationScoped
public class BankTransactionDataLoader implements EntityDataLoader<TestdataConfig.BankTransactionData> {

    private static final int ORDER = 60;

    // Amount-priority demo noise (see class doc). Generated for the first bank account only.
    private static final int NOISE_COUNT = 25;
    private static final long NOISE_ID_BASE = 101;

    @Override
    public int getOrder() {
        return ORDER;
    }

    @Override
    public String getName() {
        return "BankTransaction";
    }

    @Override
    public void loadData(TestdataConfig config, EntityManager entityManager) {
        if (config.getBankTransactions() == null || config.getBankTransactions().isEmpty()) {
            Log.info("No bank transactions to load");
            return;
        }

        Log.infof("Loading %d bank transactions", config.getBankTransactions().size());

        // Resolve organization id and seed-import id per bank account once.
        Map<Long, long[]> accountContext = new HashMap<>();

        for (TestdataConfig.BankTransactionData tx : config.getBankTransactions()) {
            long[] ctx = resolveAccountContext(entityManager, accountContext, tx.getBankAccountId());
            insert(entityManager, tx.getId(), tx.getBankAccountId(), ctx, tx.getBookingDate(), tx.getValueDate(),
                    tx.getAmount(), tx.getCurrency(), tx.getPurpose(), tx.getCounterpartyName(),
                    tx.getCounterpartyIban(), tx.getTransactionType(),
                    tx.getStatus() != null ? tx.getStatus() : "UNMATCHED",
                    tx.getMatchedAmount() != null ? tx.getMatchedAmount() : "0",
                    "td-" + tx.getId());
        }

        generateAmountPriorityNoise(config, entityManager, accountContext);
    }

    /**
     * Generates {@link #NOISE_COUNT} transactions whose purpose contains "450,00" (but whose amount is not 450,00) on
     * the first bank account, all booked after the explicit exact 450,00 match, so the "450,00" picker search exceeds
     * one page.
     */
    private void generateAmountPriorityNoise(TestdataConfig config, EntityManager entityManager,
            Map<Long, long[]> accountContext) {
        if (config.getBankAccounts() == null || config.getBankAccounts().isEmpty()) {
            return;
        }
        Long accountId = config.getBankAccounts().get(0).getId();
        long[] ctx = resolveAccountContext(entityManager, accountContext, accountId);

        Log.infof("Generating %d amount-priority demo transactions on bank account %d", NOISE_COUNT, accountId);

        for (int i = 0; i < NOISE_COUNT; i++) {
            long id = NOISE_ID_BASE + i;
            // Booking dates spread across Feb/Mar 2026 — all newer than the exact 450,00 match (booked 2026-01-02).
            String bookingDate = String.format("2026-%02d-%02d", 2 + (i / 15), 1 + (i % 15));
            String amount = "-" + (200 + i) + ".00"; // never 450.00
            insert(entityManager, id, accountId, ctx, bookingDate, bookingDate, amount, "EUR",
                    "Sammelbeitrag Rate 450,00 Position " + (i + 1), "Sammelkonto e.V.", null, null,
                    "UNMATCHED", "0", "td-noise-" + id);
        }
    }

    private long[] resolveAccountContext(EntityManager entityManager, Map<Long, long[]> cache, Long accountId) {
        return cache.computeIfAbsent(accountId, id -> {
            Number orgId = (Number) entityManager
                    .createNativeQuery("SELECT organization_id FROM BankAccount WHERE id = :id")
                    .setParameter("id", id)
                    .getSingleResult();
            Number importId = (Number) entityManager
                    .createNativeQuery("SELECT id FROM BankImport WHERE bankAccount_id = :id ORDER BY id LIMIT 1")
                    .setParameter("id", id)
                    .getSingleResult();
            return new long[] { orgId.longValue(), importId.longValue() };
        });
    }

    private void insert(EntityManager entityManager, Long id, Long accountId, long[] ctx, String bookingDate,
            String valueDate, String amount, String currency, String purpose, String counterpartyName,
            String counterpartyIban, String transactionType, String status, String matchedAmount, String dedupeHash) {
        String sql = """
                INSERT INTO BankTransaction (id, organization_id, bankAccount_id, import_id, bookingDate, valueDate,
                                             amount, currency, purpose, counterpartyName, counterpartyIban,
                                             transactionType, dedupeHash, status, matchedAmount, createdAt)
                VALUES (:id, :organizationId, :bankAccountId, :importId, CAST(:bookingDate AS date),
                        CAST(:valueDate AS date), CAST(:amount AS numeric), :currency, :purpose, :counterpartyName,
                        :counterpartyIban, :transactionType, :dedupeHash, :status, CAST(:matchedAmount AS numeric),
                        NOW())
                """;

        entityManager.createNativeQuery(sql)
                .setParameter("id", id)
                .setParameter("organizationId", ctx[0])
                .setParameter("bankAccountId", accountId)
                .setParameter("importId", ctx[1])
                .setParameter("bookingDate", bookingDate)
                .setParameter("valueDate", valueDate)
                .setParameter("amount", amount)
                .setParameter("currency", currency != null ? currency : "EUR")
                .setParameter("purpose", purpose)
                .setParameter("counterpartyName", counterpartyName)
                .setParameter("counterpartyIban", counterpartyIban)
                .setParameter("transactionType", transactionType)
                .setParameter("dedupeHash", dedupeHash)
                .setParameter("status", status)
                .setParameter("matchedAmount", matchedAmount)
                .executeUpdate();
    }
}
