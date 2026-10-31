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
    // Accounts a cross-account list is narrowed to; empty means all.
    accountIds: number[];
    setAccountIds: (ids: number[]) => void;
    // Number of column filters (account/date/amount) currently set — shown as a badge on the toggle. Search is separate.
    columnFilterCount: number;
    hasAnyFilter: boolean;
    // Resets the column filters and the search.
    clear: () => void;
    // Resets only the column filters; the search stays.
    clearColumnFilters: () => void;
}

/**
 * Search + column-filter state for a bank-transaction feed, cached in localStorage under {@code keyPrefix} (e.g.
 * {@code hopps.konten.account}) exactly like the sort/status already are, so a bookkeeper's search, date range and
 * amount range survive navigation and reloads. Pass {@code accounts} for a list that can be narrowed by account: a cached
 * selection of an account that no longer exists is dropped against it.
 */
export function useBankTxFilters(keyPrefix: string, accounts?: { id?: number }[]): BankTxFilterState {
    const [search, setSearch] = usePersistedState<string>(`${keyPrefix}.search`, '');
    const [minAmount, setMinAmount] = usePersistedState<string>(`${keyPrefix}.minAmount`, '');
    const [maxAmount, setMaxAmount] = usePersistedState<string>(`${keyPrefix}.maxAmount`, '');
    const [dateFrom, setDateFrom] = usePersistedState<string>(`${keyPrefix}.dateFrom`, '');
    const [dateTo, setDateTo] = usePersistedState<string>(`${keyPrefix}.dateTo`, '');
    const [storedAccountIds, setAccountIds] = usePersistedState<number[]>(`${keyPrefix}.accountIds`, []);
    const accountIds = accounts ? storedAccountIds.filter((id) => accounts.some((a) => a.id === id)) : [];

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
        accountIds: accountIds.length > 0 ? accountIds.join(',') : undefined,
    };

    const columnFilterCount = [dateFrom, dateTo, minAmount.trim(), maxAmount.trim()].filter(Boolean).length + accountIds.length;
    const hasAnyFilter = columnFilterCount > 0 || search.trim().length > 0;

    const clearColumnFilters = () => {
        setMinAmount('');
        setMaxAmount('');
        setDateFrom('');
        setDateTo('');
        setAccountIds([]);
    };

    const clear = () => {
        setSearch('');
        clearColumnFilters();
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
        accountIds,
        setAccountIds,
        columnFilterCount,
        hasAnyFilter,
        clear,
        clearColumnFilters,
    };
}
