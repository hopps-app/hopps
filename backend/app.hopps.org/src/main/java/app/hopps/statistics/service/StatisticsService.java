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
     *
     * @return bommel statistics
     */
    public BommelStatistics getBommelStatistics(long bommelId, boolean includeDrafts, boolean aggregate) {
        Bommel bommel = bommelRepository.findById(bommelId);
        if (bommel == null) {
            return null;
        }

        if (aggregate) {
            return calculateAggregatedStatistics(bommel, includeDrafts);
        } else {
            return calculateDirectStatistics(bommel, includeDrafts);
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
     *
     * @return map of bommel statistics
     */
    public BommelStatisticsMap getAllBommelStatistics(long organizationId, boolean includeDrafts, boolean aggregate) {
        Optional<Bommel> rootBommelOpt = bommelRepository.getRootBommel(organizationId);
        if (rootBommelOpt.isEmpty()) {
            return new BommelStatisticsMap(Map.of(), includeDrafts, aggregate);
        }

        Bommel rootBommel = rootBommelOpt.get();
        List<TreeSearchBommel> allBommels = bommelRepository.getChildrenRecursive(rootBommel);

        Map<Long, BommelStatistics> statisticsMap = new HashMap<>();

        // Add root bommel statistics
        BommelStatistics rootStats = aggregate
                ? calculateAggregatedStatistics(rootBommel, includeDrafts)
                : calculateDirectStatistics(rootBommel, includeDrafts);
        statisticsMap.put(rootBommel.id, rootStats);

        // Calculate statistics for all child bommels
        for (TreeSearchBommel tsb : allBommels) {
            Bommel bommel = tsb.bommel();
            BommelStatistics stats = aggregate
                    ? calculateAggregatedStatistics(bommel, includeDrafts)
                    : calculateDirectStatistics(bommel, includeDrafts);
            statisticsMap.put(bommel.id, stats);
        }

        return new BommelStatisticsMap(statisticsMap, includeDrafts, aggregate);
    }

    private BommelStatistics calculateDirectStatistics(Bommel bommel, boolean includeDrafts) {
        BigDecimal total = statisticsRepository.sumTotalByBommel(bommel.id, includeDrafts);
        BigDecimal income = statisticsRepository.sumIncomeByBommel(bommel.id, includeDrafts);
        BigDecimal expenses = statisticsRepository.sumExpensesByBommel(bommel.id, includeDrafts);
        int transactionsCount = statisticsRepository.countTransactionsByBommel(bommel.id, includeDrafts);

        return new BommelStatistics(
                bommel.id,
                bommel.getName(),
                total,
                income,
                expenses,
                transactionsCount,
                false);
    }

    private BommelStatistics calculateAggregatedStatistics(Bommel bommel, boolean includeDrafts) {
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
            totalAmount = totalAmount.add(statisticsRepository.sumTotalByBommel(id, includeDrafts));
            totalIncome = totalIncome.add(statisticsRepository.sumIncomeByBommel(id, includeDrafts));
            totalExpenses = totalExpenses.add(statisticsRepository.sumExpensesByBommel(id, includeDrafts));
            totalTransactions += statisticsRepository.countTransactionsByBommel(id, includeDrafts);
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
