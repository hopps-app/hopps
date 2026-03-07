import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ReceiptFiltersState, SetFilterFn } from '@/components/Receipts/types';

const STORAGE_KEY = 'hopps-receipt-filters';

const defaultFilters: ReceiptFiltersState = {
    search: '',
    startDate: null,
    endDate: null,
    project: null,
    category: null,
    area: null,
    status: { unpaid: false, draft: false, unassigned: false },
    displayAll: false,
};

function loadCachedFilters(): ReceiptFiltersState | null {
    try {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) return JSON.parse(cached);
    } catch {
        // ignore parse errors
    }
    return null;
}

function saveCachedFilters(filters: ReceiptFiltersState) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
        // ignore storage errors
    }
}

// Helper function to get initial filter state based on query parameters and cache
const getInitialFilters = (searchParams: URLSearchParams): ReceiptFiltersState => {
    const bommelIdParam = searchParams.get('bommelId');

    // If URL has bommelId, use fresh filters with that bommelId (URL takes priority)
    if (bommelIdParam) {
        return { ...defaultFilters, project: bommelIdParam };
    }

    // Otherwise restore from cache
    return loadCachedFilters() ?? { ...defaultFilters };
};

export function useReceiptFilters() {
    const [searchParams] = useSearchParams();

    const [filters, setFilters] = useState<ReceiptFiltersState>(() => getInitialFilters(searchParams));

    // Persist filters to sessionStorage on change
    useEffect(() => {
        saveCachedFilters(filters);
    }, [filters]);

    // Update filters when bommelId query parameter changes
    useEffect(() => {
        const bommelIdParam = searchParams.get('bommelId');
        if (bommelIdParam) {
            setFilters({ ...defaultFilters, project: bommelIdParam });
        }
    }, [searchParams]);

    const setFilter: SetFilterFn = useCallback((key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    }, []);

    const resetFilters = useCallback(() => {
        const bommelIdParam = searchParams.get('bommelId');
        const resetState = { ...defaultFilters, project: bommelIdParam };
        setFilters(resetState);
    }, [searchParams]);

    return { filters, setFilter, resetFilters };
}
