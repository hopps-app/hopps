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
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * The balance of a bommel works like that of a bank account: an optional opening balance on a date, plus every
 * transaction after it. For a period the statistics carry the balance at its start (carry-over) and at its end.
 */
@QuarkusTest
class StatisticsServiceBalanceTest {

    @Inject
    StatisticsService statisticsService;

    @Inject
    BommelTestResourceCreator resourceCreator;

    @Inject
    EntityManager em;

    private static final Instant START_2025 = Instant.parse("2025-01-01T00:00:00Z");
    private static final Instant START_2026 = Instant.parse("2026-01-01T00:00:00Z");
    private static final Instant START_2027 = Instant.parse("2027-01-01T00:00:00Z");

    @Test
    @TestTransaction
    void withoutOpeningBalanceTheCarryOverIsEverythingBeforeThePeriod() {
        List<Bommel> bommels = resourceCreator.setupSimpleTree();
        Bommel bommel = bommels.get(2);
        Organization org = organizationOf(bommels);

        book(org, bommel, "100.00", "2024-05-01T10:00:00Z");
        book(org, bommel, "-30.00", "2025-03-01T10:00:00Z");
        book(org, bommel, "50.00", "2026-02-01T10:00:00Z");
        em.flush();
        em.clear();

        BommelStatistics year2026 = statisticsService.getBommelStatistics(bommel.id, true, false, START_2026,
                START_2027, true);
        assertAmount("70.00", year2026.carryOver());
        assertAmount("50.00", year2026.total());
        assertAmount("120.00", year2026.balance());
    }

    @Test
    @TestTransaction
    void theOpeningBalanceReplacesEverythingUpToItsDate() {
        List<Bommel> bommels = resourceCreator.setupSimpleTree();
        Bommel bommel = bommels.get(2);
        Organization org = organizationOf(bommels);
        bommel = em.find(Bommel.class, bommel.id);
        bommel.setOpeningBalance(new BigDecimal("1000.00"));
        bommel.setOpeningBalanceDate(LocalDate.parse("2025-06-30"));

        book(org, bommel, "-200.00", "2025-03-01T10:00:00Z"); // before the date: already in the opening balance
        book(org, bommel, "-50.00", "2025-06-30T18:00:00Z"); // on the date: also in it
        book(org, bommel, "300.00", "2025-09-01T10:00:00Z"); // after: added
        book(org, bommel, "-100.00", "2026-04-01T10:00:00Z");
        em.flush();
        em.clear();

        // Year after the opening date: starts from 1000 + 300
        BommelStatistics year2026 = statisticsService.getBommelStatistics(bommel.id, true, false, START_2026,
                START_2027, true);
        assertAmount("1300.00", year2026.carryOver());
        assertAmount("-100.00", year2026.total());
        assertAmount("1200.00", year2026.balance());

        // Year around the opening date: the balance at its start is worked back from the opening balance
        BommelStatistics year2025 = statisticsService.getBommelStatistics(bommel.id, true, false, START_2025,
                START_2026, true);
        assertAmount("1250.00", year2025.carryOver());
        assertAmount("50.00", year2025.total());
        assertAmount("1300.00", year2025.balance());

        // No period: the balance now
        BommelStatistics all = statisticsService.getBommelStatistics(bommel.id, true, false, null, null, true);
        assertAmount("1200.00", all.balance());
    }

    @Test
    @TestTransaction
    void subBommelBalancesAddUpAndDraftsFollowTheSwitch() {
        List<Bommel> bommels = resourceCreator.setupSimpleTree();
        Organization org = organizationOf(bommels);
        Bommel child1 = em.find(Bommel.class, bommels.get(1).id);
        Bommel child3 = em.find(Bommel.class, bommels.get(3).id);
        child1.setOpeningBalance(new BigDecimal("500.00"));
        child1.setOpeningBalanceDate(LocalDate.parse("2025-12-31"));
        child3.setOpeningBalance(new BigDecimal("-80.00"));
        child3.setOpeningBalanceDate(LocalDate.parse("2025-12-31"));

        book(org, child3, "40.00", "2026-03-01T10:00:00Z");
        Transaction draft = book(org, child1, "1000.00", "2026-03-02T10:00:00Z");
        draft.setStatus(TransactionStatus.DRAFT);
        em.flush();
        em.clear();

        BommelStatistics confirmedOnly = statisticsService.getBommelStatistics(child1.id, false, true, START_2026,
                START_2027, true);
        assertAmount("420.00", confirmedOnly.carryOver());
        assertAmount("460.00", confirmedOnly.balance());

        BommelStatistics withDrafts = statisticsService.getBommelStatistics(child1.id, true, true, START_2026,
                START_2027, true);
        assertAmount("1460.00", withDrafts.balance());
    }

    @Test
    @TestTransaction
    void theBalanceIsOnlyComputedWhenAskedFor() {
        List<Bommel> bommels = resourceCreator.setupSimpleTree();
        BommelStatistics stats = statisticsService.getBommelStatistics(bommels.get(1).id, true, false, START_2026,
                START_2027);
        assertNull(stats.carryOver());
        assertNull(stats.balance());
    }

    private Organization organizationOf(List<Bommel> bommels) {
        return em.createQuery("SELECT o FROM Organization o WHERE o.rootBommel.id = :rootId", Organization.class)
                .setParameter("rootId", bommels.get(0).id)
                .getSingleResult();
    }

    private static void assertAmount(String expected, BigDecimal actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual),
                () -> "expected " + expected + " but was " + actual);
    }

    private Transaction book(Organization org, Bommel bommel, String total, String time) {
        Transaction transaction = new Transaction();
        transaction.setOrganization(org);
        transaction.setCreatedBy("tester");
        transaction.setStatus(TransactionStatus.CONFIRMED);
        transaction.setName("Buchung");
        transaction.setBommel(bommel);
        transaction.setTotal(new BigDecimal(total));
        transaction.setTransactionTime(Instant.parse(time));
        em.persist(transaction);
        return transaction;
    }
}
