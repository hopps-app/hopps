package app.hopps.statistics.service;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.domain.BommelTestResourceCreator;
import app.hopps.organization.domain.Organization;
import app.hopps.statistics.api.dto.BommelStatistics;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The amounts of a bommel can be limited to a period: only transactions dated inside it count, a missing bound is open.
 */
@QuarkusTest
class StatisticsServicePeriodTest {

    @Inject
    StatisticsService statisticsService;

    @Inject
    BommelTestResourceCreator resourceCreator;

    @Inject
    EntityManager em;

    private static final Instant START_2025 = Instant.parse("2025-01-01T00:00:00Z");
    private static final Instant START_2026 = Instant.parse("2026-01-01T00:00:00Z");

    @Test
    @TestTransaction
    void onlyCountsTransactionsInsideThePeriod() {
        List<Bommel> bommels = resourceCreator.setupSimpleTree();
        Bommel bommel = bommels.get(1);
        Organization org = em
                .createQuery("SELECT o FROM Organization o WHERE o.rootBommel.id = :rootId", Organization.class)
                .setParameter("rootId", bommels.get(0).id)
                .getSingleResult();

        book(org, bommel, "-100.00", "2024-12-31T23:00:00Z");
        book(org, bommel, "-200.00", "2025-06-15T10:00:00Z");
        book(org, bommel, "50.00", "2025-12-31T23:59:59Z");
        book(org, bommel, "-400.00", "2026-01-01T00:00:00Z");
        em.flush();
        em.clear();

        BommelStatistics all = statisticsService.getBommelStatistics(bommel.id, true, false, null, null);
        assertEquals(4, all.transactionsCount());
        assertEquals(0, new BigDecimal("700.00").compareTo(all.expenses()));

        BommelStatistics year2025 = statisticsService.getBommelStatistics(bommel.id, true, false, START_2025,
                START_2026);
        assertEquals(2, year2025.transactionsCount());
        assertEquals(0, new BigDecimal("200.00").compareTo(year2025.expenses()));
        assertEquals(0, new BigDecimal("50.00").compareTo(year2025.income()));
        assertEquals(0, new BigDecimal("-150.00").compareTo(year2025.total()));

        BommelStatistics fromOnly = statisticsService.getBommelStatistics(bommel.id, true, false, START_2026, null);
        assertEquals(1, fromOnly.transactionsCount());
    }

    private void book(Organization org, Bommel bommel, String total, String time) {
        Transaction transaction = new Transaction();
        transaction.setOrganization(org);
        transaction.setCreatedBy("tester");
        transaction.setStatus(TransactionStatus.CONFIRMED);
        transaction.setName("Buchung");
        transaction.setBommel(bommel);
        transaction.setTotal(new BigDecimal(total));
        transaction.setTransactionTime(Instant.parse(time));
        em.persist(transaction);
    }
}
