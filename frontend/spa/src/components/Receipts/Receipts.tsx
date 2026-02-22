import { MagnifyingGlassIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Filter } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilters } from '@/components/Receipts/Filters/ReceiptFilters';
import { useReceiptFilters } from '@/components/Receipts/hooks/useReceiptFilters';
import ReceiptsList from '@/components/Receipts/ReceiptsList';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { BaseInput } from '@/components/ui/shadecn/BaseInput';
import { usePageTitle } from '@/hooks/use-page-title';
import { cn } from '@/lib/utils';

const Receipts = () => {
    const { t } = useTranslation();
    usePageTitle(t('menu.receipts'));
    const { filters, setFilter, resetFilters } = useReceiptFilters();
    const [filtersOpen, setFiltersOpen] = useState(false);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.startDate) count++;
        if (filters.endDate) count++;
        if (filters.project) count++;
        if (filters.category) count++;
        if (filters.area) count++;
        if (filters.status.unpaid) count++;
        if (filters.status.draft) count++;
        if (filters.status.unassigned) count++;
        return count;
    }, [filters]);

    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setFilter('search', e.target.value);
        },
        [setFilter]
    );

    const handleSearchClear = useCallback(() => {
        setFilter('search', '');
    }, [setFilter]);

    return (
        <div className="w-full space-y-3">
            {/* Search + Filter Controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--grey-700)] pointer-events-none" />
                    <BaseInput
                        value={filters.search}
                        onChange={handleSearchChange}
                        placeholder={t('receipts.filters.searchPlaceholder')}
                        className={cn(
                            'w-full pl-9 pr-8 h-10 text-sm',
                            'rounded-xl border border-[#d1d5db] bg-white',
                            'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
                            'focus:border-[var(--purple-500)] transition-colors'
                        )}
                    />
                    {filters.search && (
                        <button
                            type="button"
                            onClick={handleSearchClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--grey-700)] hover:text-[var(--grey-900)] transition-colors"
                        >
                            <Cross2Icon className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <BaseButton
                        variant="outline"
                        onClick={() => setFiltersOpen(!filtersOpen)}
                        className={cn(
                            'gap-2 h-10 rounded-xl transition-colors',
                            filtersOpen ? 'bg-[var(--purple-100)] border-[var(--purple-300)] text-[var(--purple-900)]' : 'border-[#A7A7A7]'
                        )}
                    >
                        <Filter className="h-4 w-4" />
                        {t('receipts.filters.showFilters')}
                        {activeFilterCount > 0 && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--purple-500)] px-1.5 text-[11px] text-white font-semibold">
                                {activeFilterCount}
                            </span>
                        )}
                    </BaseButton>
                    {activeFilterCount > 0 && (
                        <BaseButton variant="ghost" onClick={resetFilters} className="h-10 px-4 text-sm text-[var(--grey-700)] hover:text-[var(--grey-900)]">
                            {t('receipts.filters.reset')}
                        </BaseButton>
                    )}
                </div>
            </div>

            {/* Collapsible Filter Panel */}
            {filtersOpen && <ReceiptFilters filters={filters} setFilter={setFilter} resetFilters={resetFilters} />}

            {/* Receipt Table */}
            <ReceiptsList filters={filters} />
        </div>
    );
};

export default Receipts;
