import type { BankTxFilter } from '@/hooks/queries/useBankAccounts';
import { usePersistedState } from '@/hooks/usePersistedState';

export interface BankTxFilterState {
    // The filter object passed to the bank-transaction query hooks (empty strings mean "no filter").
    filter: BankTxFilter;
    search: string;
    setSearch: (v: string) => void;
    minAmount: string;
    setMinAmount: (v: string) => void;
    maxAmount: string;
    setMaxAmount: (v: string) => void;
    dateFrom: string;
    setDateFrom: (v: string) => void;
    dateTo: string;
    setDateTo: (v: string) => void;
    // Number of column filters (date/amount) currently set — shown as a badge on the toggle. Search is separate.
    columnFilterCount: number;
    hasAnyFilter: boolean;
    clear: () => void;
}

/**
 * Search + column-filter state for a bank-transaction feed, cached in localStorage under {@code keyPrefix} (e.g.
 * {@code hopps.konten.account}) exactly like the sort/status already are, so a bookkeeper's search, date range and
 * amount range survive navigation and reloads.
 */
export function useBankTxFilters(keyPrefix: string): BankTxFilterState {
    const [search, setSearch] = usePersistedState<string>(`${keyPrefix}.search`, '');
    const [minAmount, setMinAmount] = usePersistedState<string>(`${keyPrefix}.minAmount`, '');
    const [maxAmount, setMaxAmount] = usePersistedState<string>(`${keyPrefix}.maxAmount`, '');
    const [dateFrom, setDateFrom] = usePersistedState<string>(`${keyPrefix}.dateFrom`, '');
    const [dateTo, setDateTo] = usePersistedState<string>(`${keyPrefix}.dateTo`, '');

    const filter: BankTxFilter = {
        search: search.trim() || undefined,
        minAmount: minAmount.trim() || undefined,
        maxAmount: maxAmount.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
    };

    const columnFilterCount = [dateFrom, dateTo, minAmount.trim(), maxAmount.trim()].filter(Boolean).length;
    const hasAnyFilter = columnFilterCount > 0 || search.trim().length > 0;

    const clear = () => {
        setSearch('');
        setMinAmount('');
        setMaxAmount('');
        setDateFrom('');
        setDateTo('');
    };

    return {
        filter,
        search,
        setSearch,
        minAmount,
        setMinAmount,
        maxAmount,
        setMaxAmount,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        columnFilterCount,
        hasAnyFilter,
        clear,
    };
}
