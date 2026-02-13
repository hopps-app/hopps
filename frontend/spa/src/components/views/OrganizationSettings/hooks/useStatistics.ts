import { BommelStatisticsMap } from '@hopps/api-client';
import { useCallback, useEffect, useState } from 'react';

import apiService from '@/services/ApiService';
import { useStore } from '@/store/store';

export interface StatisticsOptions {
    includeDrafts: boolean;
    aggregate: boolean;
}

export function useStatistics() {
    const store = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [bommelStats, setBommelStats] = useState<BommelStatisticsMap | null>(null);
    const [options, setOptions] = useState<StatisticsOptions>({
        includeDrafts: false,
        aggregate: false,
    });

    const loadStatistics = useCallback(async () => {
        const organizationId = store.organization?.id;
        if (!organizationId) return;

        setIsLoading(true);
        try {
            const allBommelStats = await apiService.orgService.bommels2(organizationId, options.aggregate, options.includeDrafts);
            setBommelStats(allBommelStats);
        } catch (error) {
            console.error('Failed to load statistics:', error);
        } finally {
            setIsLoading(false);
        }
    }, [store.organization?.id, options.includeDrafts, options.aggregate]);

    useEffect(() => {
        loadStatistics();
    }, [loadStatistics]);

    const setIncludeDrafts = useCallback((includeDrafts: boolean) => {
        setOptions((prev) => ({ ...prev, includeDrafts }));
    }, []);

    const setAggregate = useCallback((aggregate: boolean) => {
        setOptions((prev) => ({ ...prev, aggregate }));
    }, []);

    return {
        isLoading,
        bommelStats,
        options,
        setIncludeDrafts,
        setAggregate,
        refreshStatistics: loadStatistics,
    };
}

export default useStatistics;
