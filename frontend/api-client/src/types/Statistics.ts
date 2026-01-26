/**
 * Statistics types for organization and bommel financial data.
 * These types correspond to the backend DTOs in app.hopps.statistics.api.dto
 */

export interface OrganizationStatistics {
    totalBommels: number;
    transactionsCount: number;
    total: number;
    income: number;
    expenses: number;
}

export interface BommelStatistics {
    bommelId: number;
    bommelName: string;
    total: number;
    income: number;
    expenses: number;
    transactionsCount: number;
    aggregated: boolean;
}

export interface BommelStatisticsMap {
    statistics: Record<number, BommelStatistics>;
    includeDrafts: boolean;
    aggregated: boolean;
}
