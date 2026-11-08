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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

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
        Bommel bommel = bommelRepository.findById(bommelId);
        if (bommel == null) {
            return null;
        }

        if (aggregate) {
            return calculateAggregatedStatistics(bommel, includeDrafts, from, until);
        } else {
            return calculateDirectStatistics(bommel, includeDrafts, from, until);
        }
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
        Optional<Bommel> rootBommelOpt = bommelRepository.getRootBommel(organizationId);
        if (rootBommelOpt.isEmpty()) {
            return new BommelStatisticsMap(Map.of(), includeDrafts, aggregate);
        }

        Bommel rootBommel = rootBommelOpt.get();
        List<TreeSearchBommel> allBommels = bommelRepository.getChildrenRecursive(rootBommel);

        Map<Long, BommelStatistics> statisticsMap = new HashMap<>();

        // Add root bommel statistics
        BommelStatistics rootStats = aggregate
                ? calculateAggregatedStatistics(rootBommel, includeDrafts, from, until)
                : calculateDirectStatistics(rootBommel, includeDrafts, from, until);
        statisticsMap.put(rootBommel.id, rootStats);

        // Calculate statistics for all child bommels
        for (TreeSearchBommel tsb : allBommels) {
            Bommel bommel = tsb.bommel();
            BommelStatistics stats = aggregate
                    ? calculateAggregatedStatistics(bommel, includeDrafts, from, until)
                    : calculateDirectStatistics(bommel, includeDrafts, from, until);
            statisticsMap.put(bommel.id, stats);
        }

        return new BommelStatisticsMap(statisticsMap, includeDrafts, aggregate);
    }

    private BommelStatistics calculateDirectStatistics(Bommel bommel, boolean includeDrafts, Instant from,
            Instant until) {
        BigDecimal total = statisticsRepository.sumTotalByBommel(bommel.id, includeDrafts, from, until);
        BigDecimal income = statisticsRepository.sumIncomeByBommel(bommel.id, includeDrafts, from, until);
        BigDecimal expenses = statisticsRepository.sumExpensesByBommel(bommel.id, includeDrafts, from, until);
        int transactionsCount = statisticsRepository.countTransactionsByBommel(bommel.id, includeDrafts, from, until);

        return new BommelStatistics(
                bommel.id,
                bommel.getName(),
                total,
                income,
                expenses,
                transactionsCount,
                false);
    }

    private BommelStatistics calculateAggregatedStatistics(Bommel bommel, boolean includeDrafts, Instant from,
            Instant until) {
        // Get all child bommel IDs recursively
        List<TreeSearchBommel> children = bommelRepository.getChildrenRecursive(bommel);
        Set<Long> allBommelIds = children.stream()
                .map(tsb -> tsb.bommel().id)
                .collect(Collectors.toSet());
        allBommelIds.add(bommel.id);

        BigDecimal totalAmount = BigDecimal.ZERO;
        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpenses = BigDecimal.ZERO;
        int totalTransactions = 0;

        for (Long id : allBommelIds) {
            totalAmount = totalAmount.add(statisticsRepository.sumTotalByBommel(id, includeDrafts, from, until));
            totalIncome = totalIncome.add(statisticsRepository.sumIncomeByBommel(id, includeDrafts, from, until));
            totalExpenses = totalExpenses.add(statisticsRepository.sumExpensesByBommel(id, includeDrafts, from, until));
            totalTransactions += statisticsRepository.countTransactionsByBommel(id, includeDrafts, from, until);
        }

        return new BommelStatistics(
                bommel.id,
                bommel.getName(),
                totalAmount,
                totalIncome,
                totalExpenses,
                totalTransactions,
                true);
    }
}
