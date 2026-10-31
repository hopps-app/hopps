import { BankAccountResponse } from '@hopps/api-client';
import { Filter, Search, X } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AccountDot, AccountMultiSelect } from '@/components/BankAccounts/AccountMultiSelect';
import { FilterBadge } from '@/components/Transactions/FilterBadge';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import type { BankTxFilterState } from '@/hooks/useBankTxFilters';

const inputCls =
    'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-colors';
const fieldLabelCls = 'block text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1';
// ISO yyyy-mm-dd to dd.mm.yyyy without going through Date, so no time zone can shift the day.
const isoToDe = (iso: string) => iso.split('-').reverse().join('.');

/**
 * Renders the search box plus a toggle that reveals the column filters (booking-date range and amount-magnitude range)
 * for a bank-transaction feed. Filter changes propagate immediately (no debounce, matching the detail-view search). With
 * `accounts`, for a feed spanning several accounts, the panel also narrows it by account.
 */
export function BankTxFilterBar({ filters, accounts = [], actions }: { filters: BankTxFilterState; accounts?: BankAccountResponse[]; actions?: ReactNode }) {
    const { t } = useTranslation();
    // Auto-open the panel when a cached column filter is already active, so the user sees why the list is narrowed.
    const [open, setOpen] = useState(filters.columnFilterCount > 0);

    const activeFilters: { key: string; label: ReactNode; clear: () => void }[] = [];
    filters.accountIds.forEach((id) => {
        const account = accounts.find((a) => a.id === id);
        activeFilters.push({
            key: `account-${id}`,
            label: (
                <span className="inline-flex items-center gap-1.5">
                    <AccountDot color={account?.color} />
                    {account?.name}
                </span>
            ),
            clear: () => filters.setAccountIds(filters.accountIds.filter((other) => other !== id)),
        });
    });
    if (filters.dateFrom) {
        activeFilters.push({
            key: 'from',
            label: t('transactions.filters.fromDate', { date: isoToDe(filters.dateFrom) }),
            clear: () => filters.setDateFrom(''),
        });
    }
    if (filters.dateTo) {
        activeFilters.push({ key: 'to', label: t('transactions.filters.toDate', { date: isoToDe(filters.dateTo) }), clear: () => filters.setDateTo('') });
    }
    if (filters.minAmount.trim()) {
        activeFilters.push({ key: 'min', label: `${t('konten.filter.minAmount')}: ${filters.minAmount.trim()}`, clear: () => filters.setMinAmount('') });
    }
    if (filters.maxAmount.trim()) {
        activeFilters.push({ key: 'max', label: `${t('konten.filter.maxAmount')}: ${filters.maxAmount.trim()}`, clear: () => filters.setMaxAmount('') });
    }

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
                        className="h-11 w-full rounded-xl border border-border-soft bg-[var(--background-secondary)] pl-[38px] pr-9 text-[14.5px] text-foreground transition-shadow placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-surface)]"
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
                    className="inline-flex h-11 items-center gap-[7px] whitespace-nowrap font-semibold transition-colors"
                    style={{
                        fontSize: 13.5,
                        padding: '0 14px',
                        borderRadius: 'var(--btn-radius)',
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
                    {accounts.length > 1 && (
                        <div className="col-span-2 sm:col-span-4">
                            <span className={fieldLabelCls}>{t('konten.filter.account')}</span>
                            <AccountMultiSelect accounts={accounts} selected={filters.accountIds} onChange={filters.setAccountIds} className={inputCls} />
                        </div>
                    )}
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
                </div>
            )}

            {/* Active filters, as on the Transaktionen page. Shown whether or not the panel is open, so they can always be
                removed one by one or all at once. */}
            {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {activeFilters.map((f) => (
                        <FilterBadge key={f.key} label={f.label} onRemove={f.clear} />
                    ))}
                    <BaseButton
                        variant="ghost"
                        size="sm"
                        onClick={filters.clearColumnFilters}
                        className="rounded-[var(--btn-radius)] text-[13.5px] font-bold text-muted-foreground"
                    >
                        {t('transactions.filters.resetAll')}
                    </BaseButton>
                </div>
            )}
        </div>
    );
}
