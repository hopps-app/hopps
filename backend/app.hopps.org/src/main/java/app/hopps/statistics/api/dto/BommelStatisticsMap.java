package app.hopps.statistics.api.dto;

import java.util.Map;

/**
 * Map of bommel IDs to their statistics. Used for bulk retrieval of statistics for multiple bommels.
 */
public record BommelStatisticsMap(
        Map<Long, BommelStatistics> statistics,
        boolean includeDrafts,
        boolean aggregated) {
}
