import { useMemo } from 'react';

import { useDebounce } from './use-debounce';

export function useSearch<T>(items: T[], query: string, fields: (keyof T)[]): T[] {
    const debouncedQuery = useDebounce(query, 300);

    return useMemo(() => {
        if (!debouncedQuery.trim()) return items;

        const lowerQuery = debouncedQuery.toLowerCase();

        return items.filter((item) =>
            fields.some((field) => {
                const value = item[field];
                return value != null && String(value).toLowerCase().includes(lowerQuery);
            })
        );
    }, [items, debouncedQuery, fields]);
}
