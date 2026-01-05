import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ReceiptFiltersState, SetFilterFn } from '@/components/Receipts/types';

// Helper function to get initial filter state based on query parameters
const getInitialFilters = (searchParams: URLSearchParams): ReceiptFiltersState => {
    const baseFilters: ReceiptFiltersState = {
        search: '',
        startDate: null,
        endDate: null,
        project: '',
        category: '',
        type: { income: false, expense: false },
        status: { unpaid: false, draft: false },
        displayAll: false,
    };

    const typeParam = searchParams.get('type');

    // Check if the query parameter contains type=expense or type=income
    if (typeParam === 'expense') {
        return { ...baseFilters, type: { income: false, expense: true } };
    } else if (typeParam === 'income') {
        return { ...baseFilters, type: { income: true, expense: false } };
    }

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
