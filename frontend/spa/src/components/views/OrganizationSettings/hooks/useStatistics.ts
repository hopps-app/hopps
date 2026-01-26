import { OrganizationStatistics, BommelStatisticsMap } from '@hopps/api-client';
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
    const [organizationStats, setOrganizationStats] = useState<OrganizationStatistics | null>(null);
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
            const [orgStats, allBommelStats] = await Promise.all([
                apiService.statisticsService.getOrganizationStatistics(organizationId, options.includeDrafts),
                apiService.statisticsService.getAllBommelStatistics(organizationId, options.includeDrafts, options.aggregate),
            ]);

            setOrganizationStats(orgStats);
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
        organizationStats,
        bommelStats,
        options,
        setIncludeDrafts,
        setAggregate,
        refreshStatistics: loadStatistics,
    };
}

export default useStatistics;
