import { Filter, Search, X } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { BankTxFilterState } from '@/hooks/useBankTxFilters';

const inputCls =
    'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-colors';
const fieldLabelCls = 'block text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1';

/**
 * Renders the search box plus a toggle that reveals the column filters (booking-date range and amount-magnitude range)
 * for a bank-transaction feed. Filter changes propagate immediately (no debounce, matching the detail-view search).
 */
export function BankTxFilterBar({ filters, actions }: { filters: BankTxFilterState; actions?: ReactNode }) {
    const { t } = useTranslation();
    // Auto-open the panel when a cached column filter is already active, so the user sees why the list is narrowed.
    const [open, setOpen] = useState(filters.columnFilterCount > 0);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                {/* Search — same look as the Transaktionen page's search field. */}
                <div className="relative flex-1 min-w-0">
                    <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => filters.setSearch(e.target.value)}
                        placeholder={t('konten.filter.searchPlaceholder')}
                        className="h-9 w-full rounded-xl border border-border-soft bg-[var(--background-secondary)] pl-[38px] pr-9 text-[14.5px] text-foreground transition-shadow placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-surface)]"
                    />
                    {filters.search && (
                        <button
                            type="button"
                            onClick={() => filters.setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={t('konten.filter.clearSearch')}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Column-filter toggle — same look as the Transaktionen page's filter button. */}
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    className="inline-flex h-9 items-center gap-[7px] whitespace-nowrap font-semibold transition-colors"
                    style={{
                        fontSize: 13.5,
                        padding: '0 14px',
                        borderRadius: 9,
                        border: '1px solid',
                        borderColor: open ? 'transparent' : 'var(--border-soft)',
                        background: open ? 'var(--purple-100)' : 'var(--background-secondary)',
                        color: open ? 'var(--purple-700)' : 'var(--muted-foreground)',
                    }}
                >
                    <Filter size={15} />
                    <span className="hidden sm:inline">{t('konten.filter.filters')}</span>
                    {filters.columnFilterCount > 0 && (
                        <span
                            className="grid place-items-center rounded-full px-[5px] font-extrabold"
                            style={{
                                minWidth: 20,
                                height: 20,
                                fontSize: 11.5,
                                background: open ? 'var(--primary)' : 'var(--accent-surface)',
                                color: open ? '#FFFFFF' : 'var(--purple-700)',
                            }}
                        >
                            {filters.columnFilterCount}
                        </span>
                    )}
                </button>

                {actions}
            </div>

            {open && (
                <div
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-[18px] border border-border-soft p-4"
                    style={{ background: 'var(--background-secondary)', boxShadow: '0 1px 2px rgba(20,20,40,.05), 0 6px 22px rgba(20,20,40,.05)' }}
                >
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
