import { BankAccountResponse, DocumentResponse } from '@hopps/api-client';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeftRight,
    ArrowRight,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    Edit,
    Landmark,
    Link2,
    Plus,
    Search,
    Sheet,
    Unlink,
    Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { BankAccountDrawer } from '@/components/BankAccounts/BankAccountDrawer';
import { BankTxFilterBar } from '@/components/BankAccounts/BankTxFilterBar';
import { ImportWizardDialog } from '@/components/BankAccounts/ImportWizard';
import { MatchDrawer } from '@/components/BankAccounts/MatchDrawer';
import { LoadingState } from '@/components/common/LoadingState';
import { SortHeader } from '@/components/ui/SortHeader';
import { ReviewDrawer } from '@/components/views/BelegeView';
import {
    useBankAccounts,
    useBankTransactionsByAccount,
    useAllBankTransactions,
    useBankTransactionAggregate,
    bankTransactionKeys,
    bankImportKeys,
    type BankTransactionSortField,
} from '@/hooks/queries/useBankAccounts';
import type { SortDirection } from '@/hooks/queries/useTransactions';
import { usePageTitle } from '@/hooks/use-page-title';
import { useBankTxFilters } from '@/hooks/useBankTxFilters';
import { usePersistedState } from '@/hooks/usePersistedState';
import { cn } from '@/lib/utils';
import apiService from '@/services/ApiService';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number | undefined, currency = 'EUR'): string {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
}

function fmtDate(date: string | Date | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccountDot({ color }: { color?: string }) {
    return <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color || 'var(--color-primary)' }} />;
}

function StatusPill({ status }: { status?: string }) {
    const { t } = useTranslation();
    if (status === 'FULLY_MATCHED') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                <Link2 className="w-3 h-3" />
                {t('konten.status.matched')}
            </span>
        );
    }
    if (status === 'PARTIALLY_MATCHED') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                <Link2 className="w-3 h-3" />
                {t('konten.status.partial')}
            </span>
        );
    }
    if (status === 'IGNORED') {
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{t('konten.status.ignored')}</span>;
    }
    // UNMATCHED / default
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />
            {t('konten.status.open')}
        </span>
    );
}

function SignedAmount({
    amount,
    currency = 'EUR',
    size = 'base',
    matchedAmount,
}: {
    amount: number | undefined;
    currency?: string;
    size?: 'sm' | 'base' | 'lg';
    matchedAmount?: number;
}) {
    const { t } = useTranslation();
    const total = amount ?? 0;
    // matchedAmount is the SIGNED net coverage (income + / expense −); the still-open amount is |total − matched|, so
    // an income transaction assigned to an expense movement does not reduce it.
    const matched = matchedAmount ?? 0;
    const open = Math.abs(total - matched);
    const partiallyMatched = matched !== 0 && open > 0.005;
    const pos = total >= 0;
    const sizeClass = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base';
    return (
        <span className="inline-flex flex-col items-end leading-tight">
            <span className={cn('font-bold tabular-nums whitespace-nowrap', sizeClass, pos ? 'text-emerald-600' : 'text-foreground')}>
                {pos ? '+ ' : '– '}
                {fmtCurrency(Math.abs(total), currency)}
            </span>
            {partiallyMatched && (
                <span className="text-[11px] font-semibold text-amber-600 tabular-nums whitespace-nowrap">
                    {t('konten.openAmount', { amount: fmtCurrency(open, currency) })}
                </span>
            )}
        </span>
    );
}

// ─── Account Cards ────────────────────────────────────────────────────────────

function maskIban(iban?: string): string {
    if (!iban) return '—';
    const clean = iban.replace(/\s+/g, '');
    return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
}

function AccountCard({
    account,
    openCount,
    onClick,
    onEdit,
    onImport,
}: {
    account: BankAccountResponse;
    openCount: number;
    onClick: () => void;
    onEdit: (e: React.MouseEvent) => void;
    onImport: (e: React.MouseEvent) => void;
}) {
    const { t } = useTranslation();
    return (
        <div
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 w-64 shrink-0 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                    style={{ background: account.color || '#9955CC' }}
                >
                    <Landmark className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-bold text-[15px] truncate">{account.name}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{account.bankName}</div>
                </div>
                <button
                    type="button"
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                    onClick={onEdit}
                    title={t('common.edit')}
                >
                    <Edit className="w-4 h-4" />
                </button>
            </div>

            <div className="mt-3 text-xs font-mono text-muted-foreground tracking-widest">{maskIban(account.iban)}</div>

            <div className="flex items-end justify-between mt-3">
                <div>
                    <div className="text-xs font-semibold text-muted-foreground">{t('konten.balance')}</div>
                    <div className="text-[22px] font-black tabular-nums mt-0.5">
                        {fmtCurrency(account.balance ?? account.openingBalance, account.currency ?? 'EUR')}
                    </div>
                </div>
                <div className="text-right">
                    {openCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            {openCount} {t('konten.open')}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            <Check className="w-3 h-3" strokeWidth={3} />
                            {t('konten.allMatched')}
                        </span>
                    )}
                </div>
            </div>

            <button
                type="button"
                onClick={onImport}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground border border-gray-200 dark:border-gray-700 hover:border-primary/40 hover:text-primary transition-colors"
            >
                <Upload className="w-3.5 h-3.5" />
                {t('konten.import')}
            </button>
        </div>
    );
}

function AddAccountCard({ onClick }: { onClick: () => void }) {
    const { t } = useTranslation();
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-48 min-h-[132px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors font-bold text-sm"
        >
            <Plus className="w-6 h-6" />
            {t('konten.addAccount')}
        </button>
    );
}

// Compact one-line representation of a bank account, shown when the account section is collapsed. Clicking it jumps to
// that account's tab, just like the full card.
function AccountPill({ account, openCount, onClick }: { account: BankAccountResponse; openCount: number; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary/40 hover:shadow-sm transition-all"
        >
            <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-white" style={{ background: account.color || '#9955CC' }}>
                <Landmark className="w-3.5 h-3.5" />
            </span>
            <span className="text-sm font-semibold truncate max-w-[10rem]">{account.name}</span>
            <span className="text-sm font-bold tabular-nums text-muted-foreground">
                {fmtCurrency(account.balance ?? account.openingBalance, account.currency ?? 'EUR')}
            </span>
            {openCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                    {openCount}
                </span>
            )}
        </button>
    );
}

// ─── Abgleich Tab ─────────────────────────────────────────────────────────────

const ABGLEICH_PAGE_SIZE = 25;

function AbgleichTab({ accounts, onOpenDrawer }: { accounts: BankAccountResponse[]; onOpenDrawer: (id: number) => void }) {
    const { t } = useTranslation();
    const [page, setPage] = useState(0);
    const [sortBy, setSortBy] = usePersistedState<BankTransactionSortField>('hopps.konten.abgleich.sortBy', 'bookingDate');
    const [sortDir, setSortDir] = usePersistedState<SortDirection>('hopps.konten.abgleich.sortDir', 'desc');
    const filters = useBankTxFilters('hopps.konten.abgleich');

    // Server-side filtering narrows the feed across all pages, so reset to the first page when a filter value changes.
    const { search, minAmount, maxAmount, dateFrom, dateTo } = filters;
    useEffect(() => {
        setPage(0);
    }, [search, minAmount, maxAmount, dateFrom, dateTo]);

    // Toggle direction on the active column, otherwise switch column (default descending). Sorting is server-side and
    // spans all pages, so reset to the first page.
    const handleSort = (field: BankTransactionSortField) => {
        if (sortBy === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(field);
            setSortDir('desc');
        }
        setPage(0);
    };

    // Open = not yet fully covered: unmatched or partially matched. Counts come from the aggregate endpoint so they
    // reflect the true totals (not a single capped page), while the feed itself is paged server-side. The active
    // search/column filters are applied to both, so the badges and pagination stay consistent with the filtered feed.
    const openAgg = useBankTransactionAggregate(undefined, 'UNMATCHED,PARTIALLY_MATCHED', true, filters.filter);
    const matchedAgg = useBankTransactionAggregate(undefined, 'FULLY_MATCHED', true, filters.filter);
    const feed = useAllBankTransactions('UNMATCHED,PARTIALLY_MATCHED', page, ABGLEICH_PAGE_SIZE, sortBy, sortDir, filters.filter);

    const openCount = openAgg.data?.count ?? 0;
    const matchedCount = matchedAgg.data?.count ?? 0;
    const unmatchedTx = feed.data ?? [];
    const totalPages = Math.max(1, Math.ceil(openCount / ABGLEICH_PAGE_SIZE));

    // Reconciling items shrinks the open set; clamp the page so we never sit on a now-empty page past the end.
    useEffect(() => {
        if (page > 0 && page >= totalPages) setPage(totalPages - 1);
    }, [page, totalPages]);

    if (openAgg.isLoading || feed.isLoading) {
        return <LoadingState className="py-12" />;
    }

    const allReconciled = openCount === 0 && matchedCount > 0 && !filters.hasAnyFilter;
    const noData = openCount === 0 && matchedCount === 0 && !filters.hasAnyFilter;
    const noFilterMatch = openCount === 0 && filters.hasAnyFilter;

    return (
        <div className="flex flex-col gap-6">
            {!noData && <BankTxFilterBar filters={filters} />}

            {/* Status banner — hidden while filtering, since the celebratory/onboarding copy describes the overall
                reconciliation state, not the filtered subset. */}
            {!filters.hasAnyFilter && (
                <div
                    className={cn(
                        'flex items-center gap-4 rounded-2xl p-4',
                        allReconciled ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-purple-50 dark:bg-purple-900/20'
                    )}
                >
                    <div
                        className={cn(
                            'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white',
                            allReconciled ? 'bg-emerald-500' : 'bg-primary'
                        )}
                    >
                        {allReconciled ? <Check className="w-5 h-5" strokeWidth={2.5} /> : <ArrowLeftRight className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                        {allReconciled ? (
                            <>
                                <div className="font-bold text-base text-emerald-700">{t('konten.abgleich.allClear')}</div>
                                <div className="text-sm text-muted-foreground mt-0.5">{t('konten.abgleich.allClearDesc')}</div>
                            </>
                        ) : (
                            <>
                                <div className="font-bold text-base">
                                    {openCount} {openCount === 1 ? t('konten.abgleich.openSingular') : t('konten.abgleich.openPlural')}
                                    {matchedCount > 0 && (
                                        <span className="text-muted-foreground font-semibold">
                                            {' '}
                                            · {matchedCount} {t('konten.abgleich.matched')}
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground mt-0.5">{t('konten.abgleich.openDesc')}</div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Open bookings (paged) */}
            {openCount > 0 && (
                <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h3 className="font-bold text-[16.5px]">
                            {t('konten.abgleich.openBookings')} <span className="text-muted-foreground font-semibold">· {openCount}</span>
                        </h3>
                        <div className="flex items-center gap-4">
                            <SortHeader
                                label={t('konten.table.date')}
                                active={sortBy === 'bookingDate'}
                                direction={sortDir}
                                onClick={() => handleSort('bookingDate')}
                            />
                            <SortHeader
                                label={t('konten.table.counterparty')}
                                active={sortBy === 'counterpartyName'}
                                direction={sortDir}
                                onClick={() => handleSort('counterpartyName')}
                            />
                            <SortHeader
                                label={t('konten.table.amount')}
                                active={sortBy === 'amount'}
                                direction={sortDir}
                                onClick={() => handleSort('amount')}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2.5">
                        {unmatchedTx.map((tx) => {
                            const acct = accounts.find((a) => a.id === tx.bankAccountId);
                            return (
                                <div
                                    key={tx.id}
                                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 text-muted-foreground flex items-center justify-center flex-shrink-0">
                                        <Landmark className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm truncate">{tx.counterpartyName || t('konten.unknownCounterparty')}</div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            {fmtDate(tx.bookingDate)} · {tx.purpose}
                                        </div>
                                    </div>
                                    {acct && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-muted-foreground flex-shrink-0">
                                            <AccountDot color={acct.color} />
                                            {acct.name}
                                        </span>
                                    )}
                                    <SignedAmount amount={tx.amount} currency={tx.currency ?? 'EUR'} matchedAmount={tx.matchedAmount} />
                                    <button
                                        type="button"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-semibold hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0"
                                        onClick={() => tx.id && onOpenDrawer(tx.id)}
                                    >
                                        {t('konten.assign')} <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-xs text-muted-foreground">{t('konten.pagination.pageOf', { page: page + 1, total: totalPages })}</span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page + 1 >= totalPages}
                                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* No open booking matches the active search/filter */}
            {noFilterMatch && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 flex flex-col items-center text-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Search className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="font-semibold text-base">{t('konten.filter.noResults')}</p>
                    <button type="button" onClick={filters.clear} className="text-xs font-semibold text-primary hover:underline">
                        {t('konten.filter.clearAll')}
                    </button>
                </div>
            )}

            {/* Empty state when there are no bank transactions at all */}
            {noData && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 flex flex-col items-center text-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Unlink className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="font-semibold text-base">{t('konten.abgleich.noData')}</p>
                    <p className="text-sm text-muted-foreground max-w-sm">{t('konten.abgleich.noDataDesc')}</p>
                </div>
            )}
        </div>
    );
}

// ─── Account Tab ──────────────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'UNMATCHED' | 'FULLY_MATCHED' | 'IGNORED';

const PAGE_SIZE = 50;

function AccountTab({ account, onOpenDrawer }: { account: BankAccountResponse; onOpenDrawer: (id: number) => void }) {
    const { t } = useTranslation();
    const [statusFilter, setStatusFilter] = usePersistedState<StatusFilter>('hopps.konten.account.statusFilter', 'ALL');
    const [page, setPage] = useState(0);
    const [sortBy, setSortBy] = usePersistedState<BankTransactionSortField>('hopps.konten.account.sortBy', 'bookingDate');
    const [sortDir, setSortDir] = usePersistedState<SortDirection>('hopps.konten.account.sortDir', 'desc');
    const filters = useBankTxFilters('hopps.konten.account');

    // Server-side filtering reorders/narrows the whole result set, so jump back to the first page whenever a filter
    // value changes (same reasoning as the sort/status resets below).
    const { search, minAmount, maxAmount, dateFrom, dateTo } = filters;
    useEffect(() => {
        setPage(0);
    }, [search, minAmount, maxAmount, dateFrom, dateTo]);

    // "Offen" covers everything not yet fully matched (unmatched + partially matched).
    const apiStatus = statusFilter === 'ALL' ? undefined : statusFilter === 'UNMATCHED' ? 'UNMATCHED,PARTIALLY_MATCHED' : statusFilter;
    const { data: transactions = [], isLoading } = useBankTransactionsByAccount(account.id!, page, PAGE_SIZE, apiStatus, sortBy, sortDir, filters.filter);

    // Toggle direction when re-clicking the active column, otherwise switch column and default to descending.
    // Reset to the first page since server-side sorting reorders the whole result set.
    const handleSort = (field: BankTransactionSortField) => {
        if (sortBy === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(field);
            setSortDir('desc');
        }
        setPage(0);
    };

    const filtered = transactions;

    const statusFilters: { key: StatusFilter; label: string }[] = [
        { key: 'ALL', label: t('konten.filter.all') },
        { key: 'UNMATCHED', label: t('konten.filter.open') },
        { key: 'FULLY_MATCHED', label: t('konten.filter.matched') },
        { key: 'IGNORED', label: t('konten.filter.ignored') },
    ];

    return (
        <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <AccountDot color={account.color} />
                    <span className="font-mono">{account.iban}</span>
                    {(account.balance ?? account.openingBalance) !== undefined && (
                        <span>
                            · {t('konten.balance')} {fmtCurrency(account.balance ?? account.openingBalance, account.currency ?? 'EUR')}
                        </span>
                    )}
                </span>
                <div className="ml-auto flex rounded-xl bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5">
                    {statusFilters.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => {
                                setStatusFilter(f.key);
                                setPage(0);
                            }}
                            className={cn(
                                'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                                statusFilter === f.key ? 'bg-white dark:bg-gray-700 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-4">
                <BankTxFilterBar filters={filters} />
            </div>

            {isLoading ? (
                <LoadingState className="py-8" />
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 flex flex-col items-center text-center gap-2">
                    <Landmark className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{filters.hasAnyFilter ? t('konten.filter.noResults') : t('konten.noTransactions')}</p>
                    {filters.hasAnyFilter && (
                        <button type="button" onClick={filters.clear} className="text-xs font-semibold text-primary hover:underline">
                            {t('konten.filter.clearAll')}
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {/* Header */}
                    <div
                        className="grid text-xs font-bold uppercase tracking-wide text-muted-foreground px-4 py-2.5 border-b border-gray-100 dark:border-gray-700"
                        style={{ gridTemplateColumns: '0.9fr 1.8fr 1.1fr 1.2fr' }}
                    >
                        <SortHeader
                            label={t('konten.table.date')}
                            active={sortBy === 'bookingDate'}
                            direction={sortDir}
                            onClick={() => handleSort('bookingDate')}
                        />
                        <SortHeader
                            label={t('konten.table.counterparty')}
                            active={sortBy === 'counterpartyName'}
                            direction={sortDir}
                            onClick={() => handleSort('counterpartyName')}
                        />
                        <SortHeader
                            label={t('konten.table.amount')}
                            active={sortBy === 'amount'}
                            direction={sortDir}
                            onClick={() => handleSort('amount')}
                            align="right"
                        />
                        <span className="text-right">{t('konten.table.status')}</span>
                    </div>
                    {filtered.map((tx, i) => (
                        <div
                            key={tx.id}
                            onClick={() => tx.id && onOpenDrawer(tx.id)}
                            className={cn(
                                'grid items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer',
                                i < filtered.length - 1 && 'border-b border-gray-100 dark:border-gray-700'
                            )}
                            style={{ gridTemplateColumns: '0.9fr 1.8fr 1.1fr auto auto' }}
                        >
                            <span className="text-sm text-muted-foreground tabular-nums">{fmtDate(tx.bookingDate)}</span>
                            <div className="min-w-0">
                                <div className="text-sm font-bold truncate">{tx.counterpartyName || '—'}</div>
                                <div className="text-xs text-muted-foreground truncate">{tx.purpose}</div>
                            </div>
                            <span className="text-right">
                                <SignedAmount amount={tx.amount} currency={tx.currency ?? 'EUR'} size="sm" matchedAmount={tx.matchedAmount} />
                            </span>
                            <span className="flex justify-end">
                                <StatusPill status={tx.status} />
                            </span>
                            {(tx.status === 'UNMATCHED' || tx.status === 'PARTIALLY_MATCHED') && (
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors ml-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (tx.id) onOpenDrawer(tx.id);
                                    }}
                                >
                                    {t('konten.assign')} <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                    {(page > 0 || filtered.length === PAGE_SIZE) && (
                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40">
                            <span className="text-xs text-muted-foreground">{t('konten.pagination.page', { page: page + 1 })}</span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={filtered.length < PAGE_SIZE}
                                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Importe Tab ─────────────────────────────────────────────────────────────

function ImporteTab({ accounts, onImport }: { accounts: BankAccountResponse[]; onImport: (id: number) => void }) {
    const { t } = useTranslation();

    const importResults = useQueries({
        queries: accounts.map((a) => ({
            queryKey: bankImportKeys.byAccount(a.id!),
            queryFn: () => apiService.orgService.importsAll(a.id!, undefined),
        })),
    });

    const allImports = importResults.flatMap((r, i) => (r.data ?? []).map((imp) => ({ ...imp, account: accounts[i] })));
    allImports.sort((a, b) => {
        const da = new Date(a.finishedAt ?? 0).getTime();
        const db = new Date(b.finishedAt ?? 0).getTime();
        return db - da;
    });

    const isLoading = importResults.some((r) => r.isLoading);

    const importStatusColor: Record<string, string> = {
        COMPLETED: 'bg-emerald-100 text-emerald-700',
        PARTIAL: 'bg-amber-100 text-amber-700',
        FAILED: 'bg-red-100 text-red-700',
        PROCESSING: 'bg-blue-100 text-blue-700',
        QUEUED: 'bg-gray-100 text-gray-600',
    };

    if (isLoading) return <LoadingState className="py-12" />;

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-[16.5px]">{t('konten.imports.title')}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{t('konten.imports.subtitle')}</p>
                </div>
                {accounts.length === 1 && (
                    <button
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => onImport(accounts[0].id!)}
                    >
                        <Sheet className="w-4 h-4" />
                        {t('konten.imports.newImport')}
                    </button>
                )}
            </div>

            {allImports.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 flex flex-col items-center text-center gap-2">
                    <Sheet className="w-8 h-8 text-muted-foreground" />
                    <p className="font-semibold">{t('konten.imports.empty')}</p>
                    <p className="text-sm text-muted-foreground">{t('konten.imports.emptyDesc')}</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div
                        className="grid text-xs font-bold uppercase tracking-wide text-muted-foreground px-4 py-2.5 border-b border-gray-100 dark:border-gray-700"
                        style={{ gridTemplateColumns: '0.9fr 1.2fr 2fr 0.9fr 0.9fr 1.1fr' }}
                    >
                        <span>{t('konten.table.date')}</span>
                        <span>{t('konten.imports.account')}</span>
                        <span>{t('konten.imports.file')}</span>
                        <span className="text-right">{t('konten.imports.imported')}</span>
                        <span className="text-right">{t('konten.imports.duplicates')}</span>
                        <span className="text-right">{t('konten.imports.matched')}</span>
                    </div>
                    {allImports.map((imp, i) => {
                        const total = imp.totalTransactions ?? 0;
                        const matched = imp.matchedTransactions ?? 0;
                        const ignored = imp.ignoredTransactions ?? 0;
                        const matchedPct = total > 0 ? Math.round(((matched + ignored) / total) * 100) : 0;
                        return (
                            <div
                                key={imp.id}
                                className={cn('grid items-center px-4 py-3', i < allImports.length - 1 && 'border-b border-gray-100 dark:border-gray-700')}
                                style={{ gridTemplateColumns: '0.9fr 1.2fr 2fr 0.9fr 0.9fr 1.1fr' }}
                            >
                                <span className="text-sm text-muted-foreground tabular-nums">{fmtDate(imp.finishedAt)}</span>
                                <span className="flex items-center gap-1.5 text-sm">
                                    <AccountDot color={imp.account.color} />
                                    {imp.account.name}
                                </span>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold truncate">{imp.fileName}</div>
                                    <span
                                        className={cn(
                                            'inline-block px-1.5 py-0.5 rounded text-xs font-medium mt-0.5',
                                            importStatusColor[imp.status ?? ''] ?? 'bg-gray-100 text-gray-600'
                                        )}
                                    >
                                        {imp.status}
                                    </span>
                                </div>
                                <span className="text-right font-bold tabular-nums text-sm">{imp.importedRows ?? '—'}</span>
                                <span className="text-right tabular-nums text-sm text-muted-foreground">{imp.duplicateRows || '—'}</span>
                                <div className="flex flex-col items-end gap-1">
                                    {total > 0 ? (
                                        <>
                                            <span
                                                className={cn(
                                                    'tabular-nums text-sm font-medium',
                                                    matched + ignored === total ? 'text-emerald-600' : 'text-foreground'
                                                )}
                                            >
                                                {matched + ignored}/{total}
                                            </span>
                                            <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                                <div
                                                    className={cn(
                                                        'h-full rounded-full transition-all',
                                                        matched + ignored === total ? 'bg-emerald-500' : 'bg-primary'
                                                    )}
                                                    style={{ width: `${matchedPct}%` }}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────

type TabId = 'abgleich' | 'importe' | string; // string = account id as string

export function KontenView() {
    const { t } = useTranslation();
    usePageTitle(t('konten.title'), 'CardStack');

    const { data: accounts = [], isLoading, refetch } = useBankAccounts(false);
    const [tab, setTab] = useState<TabId>('abgleich');
    const [drawerAccount, setDrawerAccount] = useState<BankAccountResponse | 'new' | null>(null);
    const [importAccountId, setImportAccountId] = useState<number | null>(null);
    const [matchDrawerBankTxId, setMatchDrawerBankTxId] = useState<number | null>(null);
    // The account cards take up a lot of room; keep them collapsed to compact pills by default and only show the full
    // cards when the user actively expands the section. Cached like the other Konten preferences.
    const [accountsExpanded, setAccountsExpanded] = usePersistedState<boolean>('hopps.konten.accountsExpanded', false);
    // After a receipt is uploaded onto a bank transaction, its document opens in the shared receipt-review drawer right
    // here on the Konten page, so the user completes + confirms the transaction and moves on to the next bank movement.
    const [reviewDoc, setReviewDoc] = useState<DocumentResponse | null>(null);

    const queryClient = useQueryClient();
    const organization = useStore((s) => s.organization);
    const allBommels = useBommelsStore((s) => s.allBommels);
    const loadBommels = useBommelsStore((s) => s.loadBommels);

    // The bommel store is populated on-demand per view; the Konten page doesn't otherwise load it, so ensure it is
    // fetched when the review drawer opens (its bommel selector would be empty otherwise).
    useEffect(() => {
        if (reviewDoc && organization?.id && allBommels.length === 0) {
            loadBommels(organization.id);
        }
    }, [reviewDoc, organization?.id, allBommels.length, loadBommels]);

    const closeReviewDrawer = () => {
        setReviewDoc(null);
        // A confirmed transaction can flip its bank transaction to (fully) matched, so refresh the feeds/badges.
        queryClient.invalidateQueries({ queryKey: bankTransactionKeys.all });
    };

    // Open a specific bank transaction's detail drawer when navigated to with ?bankTx= (e.g. from a linked transaction).
    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
        const param = searchParams.get('bankTx');
        if (param) setMatchDrawerBankTxId(Number(param));
    }, [searchParams]);

    // Open/close the match drawer, forcing the bank-transaction feeds to refetch each time so the list's coverage /
    // still-open amounts are never stale relative to what the drawer shows (which computes live from the matches).
    const openMatchDrawer = (id: number) => {
        queryClient.invalidateQueries({ queryKey: bankTransactionKeys.all });
        setMatchDrawerBankTxId(id);
    };

    const closeMatchDrawer = () => {
        setMatchDrawerBankTxId(null);
        queryClient.invalidateQueries({ queryKey: bankTransactionKeys.all });
        if (searchParams.has('bankTx')) {
            searchParams.delete('bankTx');
            setSearchParams(searchParams, { replace: true });
        }
    };

    // True open-transaction count per account for the badges — from the aggregate endpoint so it is not capped by a
    // page size (the tab badge is the sum across accounts).
    const openCountResults = useQueries({
        queries: accounts.map((a) => ({
            queryKey: bankTransactionKeys.aggregate(String(a.id), 'UNMATCHED,PARTIALLY_MATCHED'),
            queryFn: () => apiService.orgService.aggregate(String(a.id), undefined, undefined, undefined, undefined, undefined, 'UNMATCHED,PARTIALLY_MATCHED'),
        })),
    });
    const openCountByAccount = Object.fromEntries(accounts.map((a, i) => [String(a.id), openCountResults[i]?.data?.count ?? 0]));
    const totalOpen = Object.values(openCountByAccount).reduce((a, b) => a + b, 0);

    const activeAccount = accounts.find((a) => String(a.id) === tab);

    const tabs: { id: TabId; label: string; badge?: number }[] = [
        { id: 'abgleich', label: t('konten.tabs.abgleich'), badge: totalOpen > 0 ? totalOpen : undefined },
        ...accounts.map((a) => ({ id: String(a.id), label: a.name ?? '' })),
        { id: 'importe', label: t('konten.tabs.importe') },
    ];

    if (isLoading) {
        return <LoadingState className="py-12" />;
    }

    return (
        <div className="flex flex-col gap-6 max-w-screen-xl">
            {/* Page header */}
            <p className="text-muted-foreground text-sm">{t('konten.subtitle')}</p>

            {/* Bank accounts — collapsed to compact pills by default, expandable to the full cards. The header mirrors
                the collapsible upload panel on the Belege page: icon box + title on the left, chevron on the right.
                When there are no accounts yet the section is forced open so the "add account" card is shown right away. */}
            <div className="flex flex-col gap-3">
                {/* Header + collapse toggle — only meaningful once at least one account exists. */}
                {accounts.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setAccountsExpanded((v) => !v)}
                        aria-expanded={accountsExpanded}
                        className="w-full flex items-center gap-3 text-left"
                    >
                        <span className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
                            <Landmark className="w-[18px] h-[18px]" />
                        </span>
                        <span className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-bold text-foreground">
                                {t('konten.accounts')} <span className="text-muted-foreground font-semibold">· {accounts.length}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {accountsExpanded ? t('konten.accountsCollapse') : t('konten.accountsExpand')}
                            </span>
                        </span>
                        <ChevronDown
                            className={cn('w-[18px] h-[18px] text-muted-foreground transition-transform flex-shrink-0', accountsExpanded ? 'rotate-180' : '')}
                        />
                    </button>
                )}

                {/* Collapsed: compact pills only (the add button lives in the expanded cards view) */}
                {accounts.length > 0 && !accountsExpanded && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {accounts.map((a) => (
                            <AccountPill
                                key={a.id}
                                account={a}
                                openCount={openCountByAccount[String(a.id)] ?? 0}
                                onClick={() => {
                                    setTab(String(a.id));
                                    setAccountsExpanded(true);
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Expanded: full account cards (always shown while there are no accounts, so the add card is visible) */}
                {(accountsExpanded || accounts.length === 0) && (
                    <div className="flex flex-wrap gap-4">
                        {accounts.map((a) => (
                            <AccountCard
                                key={a.id}
                                account={a}
                                openCount={openCountByAccount[String(a.id)] ?? 0}
                                onClick={() => setTab(String(a.id))}
                                onEdit={(e) => {
                                    e.stopPropagation();
                                    setDrawerAccount(a);
                                }}
                                onImport={(e) => {
                                    e.stopPropagation();
                                    setImportAccountId(a.id!);
                                }}
                            />
                        ))}
                        <AddAccountCard onClick={() => setDrawerAccount('new')} />
                    </div>
                )}
            </div>

            {/* Segmented tab bar */}
            <div className="flex gap-0.5 rounded-xl bg-gray-100 dark:bg-gray-800 p-0.5 w-fit flex-wrap">
                {tabs.map((t_) => (
                    <button
                        key={t_.id}
                        type="button"
                        onClick={() => setTab(t_.id)}
                        className={cn(
                            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-sm font-medium transition-colors whitespace-nowrap',
                            tab === t_.id ? 'bg-white dark:bg-gray-700 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {t_.label}
                        {t_.badge !== undefined && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                                {t_.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'abgleich' && <AbgleichTab accounts={accounts} onOpenDrawer={openMatchDrawer} />}
            {activeAccount && <AccountTab account={activeAccount} onOpenDrawer={openMatchDrawer} />}
            {tab === 'importe' && <ImporteTab accounts={accounts} onImport={setImportAccountId} />}

            {/* Match drawer */}
            {matchDrawerBankTxId !== null && (
                <MatchDrawer bankTxId={matchDrawerBankTxId} onClose={closeMatchDrawer} onReceiptUploaded={(doc) => setReviewDoc(doc)} />
            )}

            {/* Receipt-review drawer (shared with the Belege page): opened in place after a receipt upload so the user
                completes + confirms the transaction and continues with the next bank movement without navigating away. */}
            <ReviewDrawer doc={reviewDoc} onClose={closeReviewDrawer} onDeleted={closeReviewDrawer} />

            {/* Create / Edit drawer */}
            <BankAccountDrawer
                open={drawerAccount !== null}
                onOpenChange={(open) => {
                    if (!open) setDrawerAccount(null);
                }}
                account={drawerAccount !== 'new' ? (drawerAccount ?? undefined) : undefined}
                onSuccess={() => {
                    refetch();
                    setDrawerAccount(null);
                }}
            />

            {/* Import wizard dialog */}
            <ImportWizardDialog
                accountId={importAccountId}
                open={importAccountId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setImportAccountId(null);
                        refetch();
                    }
                }}
            />
        </div>
    );
}

export default KontenView;
