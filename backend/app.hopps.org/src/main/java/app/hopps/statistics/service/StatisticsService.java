package app.hopps.statistics.service;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.domain.TreeSearchBommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.statistics.api.dto.BommelStatistics;
import app.hopps.statistics.api.dto.BommelStatisticsMap;
import app.hopps.statistics.api.dto.OrganizationStatistics;
import app.hopps.statistics.repository.StatisticsRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@ApplicationScoped
public class StatisticsService {

    @Inject
    StatisticsRepository statisticsRepository;

    @Inject
    BommelRepository bommelRepository;

    /**
     * Calculate organization-wide statistics.
     *
     * @param organizationId
     *            the organization ID
     * @param includeDrafts
     *            whether to include draft transactions
     *
     * @return organization statistics
     */
    public OrganizationStatistics getOrganizationStatistics(long organizationId, boolean includeDrafts) {
        // Count all bommels for this organization using the root bommel
        Optional<Bommel> rootBommelOpt = bommelRepository.getRootBommel(organizationId);
        if (rootBommelOpt.isEmpty()) {
            return new OrganizationStatistics(0, 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }

        Bommel rootBommel = rootBommelOpt.get();
        List<TreeSearchBommel> allBommels = bommelRepository.getChildrenRecursive(rootBommel);
        int totalBommels = allBommels.size() + 1; // +1 for root

        // Get financial totals
        BigDecimal total = statisticsRepository.sumTotal(organizationId, includeDrafts);
        BigDecimal income = statisticsRepository.sumIncome(organizationId, includeDrafts);
        BigDecimal expenses = statisticsRepository.sumExpenses(organizationId, includeDrafts);

        // Count transactions
        int transactionsCount = statisticsRepository.countTransactions(organizationId, includeDrafts);

        return new OrganizationStatistics(totalBommels, transactionsCount, total, income, expenses);
    }

    /**
     * Calculate statistics for a specific bommel.
     *
     * @param bommelId
     *            the bommel ID
     * @param includeDrafts
     *            whether to include draft transactions
     * @param aggregate
     *            whether to aggregate statistics from child bommels
     * @param from
     *            only transactions on or after this instant, or null
     * @param until
     *            only transactions before this instant, or null
     *
     * @return bommel statistics
     */
    public BommelStatistics getBommelStatistics(long bommelId, boolean includeDrafts, boolean aggregate, Instant from,
            Instant until) {
        return getBommelStatistics(bommelId, includeDrafts, aggregate, from, until, false);
    }

    /**
     * Same as {@link #getBommelStatistics(long, boolean, boolean, Instant, Instant)}; with {@code withBalance} the
     * result also carries the balance at the start and at the end of the period.
     */
    public BommelStatistics getBommelStatistics(long bommelId, boolean includeDrafts, boolean aggregate, Instant from,
            Instant until, boolean withBalance) {
        Bommel bommel = bommelRepository.findById(bommelId);
        if (bommel == null) {
            return null;
        }
        return statisticsFor(bommel, includeDrafts, aggregate, from, until, withBalance);
    }

    /**
     * Calculate statistics for all bommels in an organization.
     *
     * @param organizationId
     *            the organization ID
     * @param includeDrafts
     *            whether to include draft transactions
     * @param aggregate
     *            whether to aggregate statistics from child bommels
     * @param from
     *            only transactions on or after this instant, or null
     * @param until
     *            only transactions before this instant, or null
     *
     * @return map of bommel statistics
     */
    public BommelStatisticsMap getAllBommelStatistics(long organizationId, boolean includeDrafts, boolean aggregate,
            Instant from, Instant until) {
        return getAllBommelStatistics(organizationId, includeDrafts, aggregate, from, until, false);
    }

    /**
     * Same as {@link #getAllBommelStatistics(long, boolean, boolean, Instant, Instant)}; with {@code withBalance} every
     * entry also carries the balance at the start and at the end of the period.
     */
    public BommelStatisticsMap getAllBommelStatistics(long organizationId, boolean includeDrafts, boolean aggregate,
            Instant from, Instant until, boolean withBalance) {
        Optional<Bommel> rootBommelOpt = bommelRepository.getRootBommel(organizationId);
        if (rootBommelOpt.isEmpty()) {
            return new BommelStatisticsMap(Map.of(), includeDrafts, aggregate);
        }

        Bommel rootBommel = rootBommelOpt.get();
        List<TreeSearchBommel> allBommels = bommelRepository.getChildrenRecursive(rootBommel);

        Map<Long, BommelStatistics> statisticsMap = new HashMap<>();

        statisticsMap.put(rootBommel.id, statisticsFor(rootBommel, includeDrafts, aggregate, from, until, withBalance));
        for (TreeSearchBommel tsb : allBommels) {
            Bommel bommel = tsb.bommel();
            statisticsMap.put(bommel.id, statisticsFor(bommel, includeDrafts, aggregate, from, until, withBalance));
        }

        return new BommelStatisticsMap(statisticsMap, includeDrafts, aggregate);
    }

    /**
     * The amounts of {@code bommel} for the period: its own, or with {@code aggregate} also those of every bommel below
     * it. With {@code withBalance} also the balance at the start and the end of the period, summed the same way.
     */
    private BommelStatistics statisticsFor(Bommel bommel, boolean includeDrafts, boolean aggregate, Instant from,
            Instant until, boolean withBalance) {
        List<Bommel> scope = new ArrayList<>();
        scope.add(bommel);
        if (aggregate) {
            bommelRepository.getChildrenRecursive(bommel).forEach(tsb -> scope.add(tsb.bommel()));
        }

        BigDecimal total = BigDecimal.ZERO;
        BigDecimal income = BigDecimal.ZERO;
        BigDecimal expenses = BigDecimal.ZERO;
        BigDecimal balance = BigDecimal.ZERO;
        int count = 0;
        for (Bommel b : scope) {
            total = total.add(statisticsRepository.sumTotalByBommel(b.id, includeDrafts, from, until));
            income = income.add(statisticsRepository.sumIncomeByBommel(b.id, includeDrafts, from, until));
            expenses = expenses.add(statisticsRepository.sumExpensesByBommel(b.id, includeDrafts, from, until));
            count += statisticsRepository.countTransactionsByBommel(b.id, includeDrafts, from, until);
            if (withBalance) {
                balance = balance.add(balanceAt(b, includeDrafts, until));
            }
        }

        if (!withBalance) {
            return new BommelStatistics(bommel.id, bommel.getName(), total, income, expenses, count, aggregate);
        }
        // What the period adds leads from the balance at its start to the one at its end
        return new BommelStatistics(bommel.id, bommel.getName(), total, income, expenses, count, aggregate,
                balance.subtract(total), balance);
    }

    /**
     * Balance of one bommel (only its own transactions) just before {@code until}, or now when that is null.
     * <p>
     * Like a bank account: with an opening balance it is that value plus every transaction after its date. When
     * {@code until} lies before that date, the transactions between the two are taken off instead, so the balance is
     * consistent for every point in time. Without an opening balance it is simply the sum of everything before
     * {@code until}.
     */
    BigDecimal balanceAt(Bommel bommel, boolean includeDrafts, Instant until) {
        LocalDate openingDate = bommel.getOpeningBalanceDate();
        if (openingDate == null || bommel.getOpeningBalance() == null) {
            return statisticsRepository.sumTotalByBommel(bommel.id, includeDrafts, null, until);
        }
        // The opening balance includes its date; the first day that counts on top is the next one
        Instant afterOpening = openingDate.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        BigDecimal balance = bommel.getOpeningBalance();
        if (until == null || until.isAfter(afterOpening)) {
            return balance.add(statisticsRepository.sumTotalByBommel(bommel.id, includeDrafts, afterOpening, until));
        }
        if (until.isBefore(afterOpening)) {
            return balance
                    .subtract(statisticsRepository.sumTotalByBommel(bommel.id, includeDrafts, until, afterOpening));
        }
        return balance;
    }
}
