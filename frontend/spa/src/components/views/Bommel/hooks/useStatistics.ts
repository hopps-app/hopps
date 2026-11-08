import { BommelStatisticsMap } from '@hopps/api-client';
import { useCallback, useEffect, useState } from 'react';

import { periodToRange, type Period } from '../period';

import { usePersistedState } from '@/hooks/usePersistedState';
import apiService from '@/services/ApiService';
import { useStore } from '@/store/store';

export interface StatisticsOptions {
    includeDrafts: boolean;
    aggregate: boolean;
    /** Also load the balance: the carry-over at the start of the period, which the total then includes */
    showBalance: boolean;
}

const DEFAULT_OPTIONS: StatisticsOptions = { includeDrafts: false, aggregate: false, showBalance: false };

/**
 * Amounts per bommel for the given period; reloads whenever the period or an option changes. The switches are
 * remembered like the period, so the page opens the way it was left.
 */
export function useStatistics(period: Period) {
    const store = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [bommelStats, setBommelStats] = useState<BommelStatisticsMap | null>(null);
    const [storedOptions, setOptions] = usePersistedState<StatisticsOptions>('hopps.bommel.statisticsOptions', DEFAULT_OPTIONS);
    // Stored by an earlier version without every switch: the missing ones take their default
    const options: StatisticsOptions = { ...DEFAULT_OPTIONS, ...storedOptions };

    const { startDate, endDate } = periodToRange(period);

    const loadStatistics = useCallback(async () => {
        const organizationId = store.organization?.id;
        if (!organizationId) return;

        setIsLoading(true);
        try {
            const allBommelStats = await apiService.orgService.bommels2(
                organizationId,
                options.aggregate,
                endDate,
                options.includeDrafts,
                startDate,
                options.showBalance
            );
            setBommelStats(allBommelStats);
        } catch (error) {
            console.error('Failed to load statistics:', error);
        } finally {
            setIsLoading(false);
        }
    }, [store.organization?.id, options.includeDrafts, options.aggregate, options.showBalance, startDate, endDate]);

    useEffect(() => {
        loadStatistics();
    }, [loadStatistics]);

    const setIncludeDrafts = useCallback((includeDrafts: boolean) => {
        setOptions((prev) => ({ ...DEFAULT_OPTIONS, ...prev, includeDrafts }));
    }, []);

    const setAggregate = useCallback((aggregate: boolean) => {
        setOptions((prev) => ({ ...DEFAULT_OPTIONS, ...prev, aggregate }));
    }, []);

    const setShowBalance = useCallback((showBalance: boolean) => {
        setOptions((prev) => ({ ...DEFAULT_OPTIONS, ...prev, showBalance }));
    }, []);

    return {
        isLoading,
        bommelStats,
        options,
        setIncludeDrafts,
        setAggregate,
        setShowBalance,
        refreshStatistics: loadStatistics,
    };
}

export default useStatistics;
