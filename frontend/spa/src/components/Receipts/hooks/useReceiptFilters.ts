import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ReceiptFiltersState, SetFilterFn } from '@/components/Receipts/types';

// Helper function to get initial filter state based on query parameters
const getInitialFilters = (searchParams: URLSearchParams): ReceiptFiltersState => {
    const baseFilters: ReceiptFiltersState = {
        search: '',
        startDate: null,
        endDate: null,
        project: searchParams.get('bommelId') || null,
        category: null,
        area: null,
        status: { unpaid: false, draft: false },
        displayAll: false,
    };

    return baseFilters;
};

export function useReceiptFilters() {
    const [searchParams] = useSearchParams();

    const [filters, setFilters] = useState<ReceiptFiltersState>(() => getInitialFilters(searchParams));

    // Update filters when the query parameters change
    useEffect(() => {
        const newFilters = getInitialFilters(searchParams);
        setFilters(newFilters);
    }, [searchParams]);

    const setFilter: SetFilterFn = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        // Reset to initial state based on current query parameters
        setFilters(getInitialFilters(searchParams));
    };

    return { filters, setFilter, resetFilters };
}
