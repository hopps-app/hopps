import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { BankTxFilterState } from '@/hooks/useBankTxFilters';
import { cn } from '@/lib/utils';

const inputCls =
    'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-colors';
const fieldLabelCls = 'block text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1';

/**
 * Renders the search box plus a toggle that reveals the column filters (booking-date range and amount-magnitude range)
 * for a bank-transaction feed. Filter changes propagate immediately (no debounce, matching the detail-view search).
 */
export function BankTxFilterBar({ filters }: { filters: BankTxFilterState }) {
    const { t } = useTranslation();
    // Auto-open the panel when a cached column filter is already active, so the user sees why the list is narrowed.
    const [open, setOpen] = useState(filters.columnFilterCount > 0);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                {/* Search */}
                <div className="flex flex-1 items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => filters.setSearch(e.target.value)}
                        placeholder={t('konten.filter.searchPlaceholder')}
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    {filters.search && (
                        <button
                            type="button"
                            onClick={() => filters.setSearch('')}
                            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                            aria-label={t('konten.filter.clearSearch')}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Column-filter toggle */}
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors',
                        open || filters.columnFilterCount > 0
                            ? 'border-primary/40 bg-primary/5 text-primary'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-muted-foreground hover:text-foreground'
                    )}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('konten.filter.filters')}</span>
                    {filters.columnFilterCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                            {filters.columnFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {open && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40">
                    <div>
                        <label className={fieldLabelCls}>{t('konten.filter.dateFrom')}</label>
                        <input type="date" value={filters.dateFrom} onChange={(e) => filters.setDateFrom(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <label className={fieldLabelCls}>{t('konten.filter.dateTo')}</label>
                        <input type="date" value={filters.dateTo} onChange={(e) => filters.setDateTo(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <label className={fieldLabelCls}>{t('konten.filter.minAmount')}</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={filters.minAmount}
                            onChange={(e) => filters.setMinAmount(e.target.value)}
                            placeholder="0"
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={fieldLabelCls}>{t('konten.filter.maxAmount')}</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={filters.maxAmount}
                            onChange={(e) => filters.setMaxAmount(e.target.value)}
                            placeholder="∞"
                            className={inputCls}
                        />
                    </div>
                    {filters.hasAnyFilter && (
                        <button
                            type="button"
                            onClick={filters.clear}
                            className="col-span-2 sm:col-span-4 justify-self-start inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                            {t('konten.filter.clearAll')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
