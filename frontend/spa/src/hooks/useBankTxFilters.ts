import type { BankTxFilter } from '@/hooks/queries/useBankAccounts';
import { useDebounce } from '@/hooks/use-debounce';
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

    // The free-text inputs (search + amount range) drive the server query only after a short pause: debouncing the
    // query-facing value keeps typing from firing a request on every keystroke and from thrashing the query key — which
    // would otherwise remount the transaction list and steal focus back out of the search box after each letter. The
    // inputs themselves stay bound to the immediate state above, so typing still feels instant.
    const debouncedSearch = useDebounce(search.trim(), 350);
    const debouncedMinAmount = useDebounce(minAmount.trim(), 350);
    const debouncedMaxAmount = useDebounce(maxAmount.trim(), 350);

    const filter: BankTxFilter = {
        search: debouncedSearch || undefined,
        minAmount: debouncedMinAmount || undefined,
        maxAmount: debouncedMaxAmount || undefined,
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
