import { useState } from 'react';

import { ReceiptFiltersState, SetFilterFn } from '@/components/Receipts/types';

export function useReceiptFilters() {
    const [filters, setFilters] = useState<ReceiptFiltersState>({
        search: '',
        startDate: null,
        endDate: null,
        project: '',
        category: '',
        type: { income: false, expense: false },
        status: { unpaid: false, draft: false },
        displayAll: false,
    });

    const setFilter: SetFilterFn = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const resetFilters = () =>
        setFilters({
            search: '',
            startDate: null,
            endDate: null,
            project: '',
            category: '',
            type: { income: false, expense: false },
            status: { unpaid: false, draft: false },
            displayAll: false,
        });

    return { filters, setFilter, resetFilters };
}
