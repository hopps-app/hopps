import { BankAccountResponse, IBankImportResponse } from '@hopps/api-client';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Edit, Landmark, Plus, Search, Trash2, Unlink, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { BankAccountDrawer } from '@/components/BankAccounts/BankAccountDrawer';
import { BANK_STATUS_STYLE, BankStatusBadge, type BankTransactionStatusValue } from '@/components/BankAccounts/BankStatusBadge';
import { BankTxFilterBar } from '@/components/BankAccounts/BankTxFilterBar';
import { ImportWizardDialog } from '@/components/BankAccounts/ImportWizard';
import { MatchDrawer } from '@/components/BankAccounts/MatchDrawer';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge, type BadgeTone } from '@/components/Transactions/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RowAction } from '@/components/ui/RowAction';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { SortHeader } from '@/components/ui/SortHeader';
import { StatusFilterBar, type StatusFilterItem } from '@/components/ui/StatusFilterBar';
import {
    useBankAccounts,
    useBankTransactionsByAccount,
    useAllBankTransactions,
    useBankTransactionAggregate,
    useRollbackImport,
    bankTransactionKeys,
    bankImportKeys,
    type BankTransactionSortField,
} from '@/hooks/queries/useBankAccounts';
import type { SortDirection } from '@/hooks/queries/useTransactions';
import { useCurrency } from '@/hooks/use-currency';
import { usePageTitle } from '@/hooks/use-page-title';
import { useBankTxFilters } from '@/hooks/useBankTxFilters';
import { usePersistedState } from '@/hooks/usePersistedState';
import { cn } from '@/lib/utils';
import apiService from '@/services/ApiService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(date: string | Date | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Soft elevation for the page's white surfaces — same two-layer shadow the Belege/Transaktionen cards use.
const cardShadow = 'shadow-[0_1px_2px_rgba(20,20,40,.05),0_6px_22px_rgba(20,20,40,.05)]';

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccountDot({ color }: { color?: string }) {
    return <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color || 'var(--color-primary)' }} />;
}

function SignedAmount({ amount, currency, size = 'base' }: { amount: number | undefined; currency?: string; size?: 'sm' | 'base' | 'lg' }) {
    const { format } = useCurrency();
    const total = amount ?? 0;
    const pos = total >= 0;
    const sizeClass = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base';
    return (
        <span className={cn('font-bold tabular-nums whitespace-nowrap', sizeClass, pos ? 'text-emerald-600' : 'text-foreground')}>
            {pos ? '+ ' : '– '}
            {format(Math.abs(total), { currency })}
        </span>
    );
}

// ─── Account Cards ────────────────────────────────────────────────────────────

// Account colour tile: a soft two-stop gradient with a tinted glow instead of a flat fill, matching the gradient
// language of the app's primary buttons. `color-mix` derives the lighter top stop straight from the account colour,
// so any colour the user picks works without parsing the hex.
function accountTileStyle(color?: string, glow = 14): React.CSSProperties {
    const c = color || '#9955CC';
    return {
        background: `linear-gradient(140deg, color-mix(in srgb, ${c} 72%, white) 0%, ${c} 60%, color-mix(in srgb, ${c} 88%, black) 100%)`,
        boxShadow: `0 ${glow / 5}px ${glow * 0.7}px color-mix(in srgb, ${c} 22%, transparent)`,
    };
}

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
    const { format } = useCurrency();
    const { t } = useTranslation();
    return (
        <div
            className={cn(
                cardShadow,
                'bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 w-64 shrink-0 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all'
            )}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
            <div className="flex items-center gap-3">
                <div
                    className="w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0 text-white ring-1 ring-inset ring-white/25"
                    style={accountTileStyle(account.color)}
                >
                    <Landmark className="w-[19px] h-[19px]" strokeWidth={1.75} />
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

            {/* The status pill shares the small label line rather than sitting beside the amount: at the card's width
                a long balance and the pill collided, and the pill competed with the number for attention. */}
            <div className="mt-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{t('konten.balance')}</span>
                    {openCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                            {openCount} {t('konten.open')}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                            <Check className="w-3 h-3" strokeWidth={3} />
                            {t('konten.allMatched')}
                        </span>
                    )}
                </div>
                <div className="text-[22px] font-black tabular-nums mt-0.5">
                    {format(account.balance ?? account.openingBalance, { currency: account.currency })}
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
    const { format } = useCurrency();
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary/40 hover:shadow-sm transition-all"
        >
            <span
                className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0 text-white ring-1 ring-inset ring-white/25"
                style={accountTileStyle(account.color, 10)}
            >
                <Landmark className="w-[17px] h-[17px]" strokeWidth={1.75} />
            </span>
            <span className="text-[15px] font-semibold truncate max-w-[12rem]">{account.name}</span>
            <span className="text-[15px] font-bold tabular-nums text-muted-foreground">
                {format(account.balance ?? account.openingBalance, { currency: account.currency })}
            </span>
            {openCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[21px] h-[21px] px-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
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
                                    className={cn(
                                        cardShadow,
                                        'bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4'
                                    )}
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
                                    <SignedAmount amount={tx.amount} currency={tx.currency} />
                                    <RowAction onClick={() => tx.id && onOpenDrawer(tx.id)}>{t('konten.assign')}</RowAction>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 mb-4">
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
                <div
                    className={cn(
                        cardShadow,
                        'bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 flex flex-col items-center text-center gap-3'
                    )}
                >
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
                <div
                    className={cn(
                        cardShadow,
                        'bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 flex flex-col items-center text-center gap-3'
                    )}
                >
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

// Statuses of the account tab's filter, one toggle each, in this order.
const ACCOUNT_STATUSES: BankTransactionStatusValue[] = ['UNMATCHED', 'PARTIALLY_MATCHED', 'FULLY_MATCHED', 'IGNORED'];

const PAGE_SIZE = 50;

// Header and rows must share one template, otherwise the labels sit over the wrong columns. The trailing status and
// action columns are fixed-width so the pills and buttons line up down the list regardless of row content.
const ACCOUNT_TX_COLUMNS = '7.5rem minmax(0, 2fr) minmax(0, 1fr) 7.5rem 7.5rem';

function AccountTab({
    account,
    onOpenDrawer,
    onImport,
}: {
    account: BankAccountResponse;
    onOpenDrawer: (id: number) => void;
    onImport: (accountId: number) => void;
}) {
    const { format } = useCurrency();
    const { t } = useTranslation();
    // Several statuses can be selected; none selected shows every movement. Starts on the worklist: Offen and
    // Teilverknüpft.
    const [statuses, setStatuses] = usePersistedState<BankTransactionStatusValue[]>('hopps.konten.account.bankStatuses', ['UNMATCHED', 'PARTIALLY_MATCHED']);
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

    const apiStatus = statuses.length > 0 ? statuses.join(',') : undefined;
    // Counts per status for the filter, following the other filters (search, amount, date).
    const accountIds = String(account.id);
    const unmatchedAgg = useBankTransactionAggregate(accountIds, 'UNMATCHED', true, filters.filter);
    const partialAgg = useBankTransactionAggregate(accountIds, 'PARTIALLY_MATCHED', true, filters.filter);
    const matchedAgg = useBankTransactionAggregate(accountIds, 'FULLY_MATCHED', true, filters.filter);
    const ignoredAgg = useBankTransactionAggregate(accountIds, 'IGNORED', true, filters.filter);
    const statusCounts: Record<BankTransactionStatusValue, number> = {
        UNMATCHED: unmatchedAgg.data?.count ?? 0,
        PARTIALLY_MATCHED: partialAgg.data?.count ?? 0,
        FULLY_MATCHED: matchedAgg.data?.count ?? 0,
        IGNORED: ignoredAgg.data?.count ?? 0,
    };
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

    const statusItems: StatusFilterItem<BankTransactionStatusValue>[] = ACCOUNT_STATUSES.map((status) => ({
        id: status,
        label: t(BANK_STATUS_STYLE[status].labelKey),
        count: statusCounts[status],
        color: BANK_STATUS_STYLE[status].color,
        tint: BANK_STATUS_STYLE[status].tint,
    }));

    return (
        <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <AccountDot color={account.color} />
                    <span className="font-mono">{account.iban}</span>
                    {(account.balance ?? account.openingBalance) !== undefined && (
                        <span>
                            · {t('konten.balance')} {format(account.balance ?? account.openingBalance, { currency: account.currency })}
                        </span>
                    )}
                </span>
                <div className="ml-auto">
                    <StatusFilterBar
                        ariaLabel={t('konten.table.status')}
                        items={statusItems}
                        value={statuses}
                        onChange={(next) => {
                            setStatuses(next);
                            setPage(0);
                        }}
                    />
                </div>
            </div>

            <div className="mb-4">
                <BankTxFilterBar
                    filters={filters}
                    actions={
                        <BaseButton size="sm" className="gap-1.5 whitespace-nowrap" onClick={() => onImport(account.id!)}>
                            <Upload className="w-4 h-4" />
                            {t('konten.import')}
                        </BaseButton>
                    }
                />
            </div>

            {isLoading ? (
                <LoadingState className="py-8" />
            ) : filtered.length === 0 ? (
                <div
                    className={cn(
                        cardShadow,
                        'bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 flex flex-col items-center text-center gap-2'
                    )}
                >
                    <Landmark className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{filters.hasAnyFilter ? t('konten.filter.noResults') : t('konten.noTransactions')}</p>
                    {filters.hasAnyFilter && (
                        <button type="button" onClick={filters.clear} className="text-xs font-semibold text-primary hover:underline">
                            {t('konten.filter.clearAll')}
                        </button>
                    )}
                </div>
            ) : (
                <div className={cn(cardShadow, 'bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden')}>
                    {/* Header */}
                    <div
                        className="grid text-xs font-bold uppercase tracking-wide text-muted-foreground px-4 py-2.5 border-b border-gray-100 dark:border-gray-700"
                        style={{ gridTemplateColumns: ACCOUNT_TX_COLUMNS }}
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
                        <span className="text-center">{t('konten.table.status')}</span>
                        {/* Spacer above the per-row action */}
                        <span aria-hidden />
                    </div>
                    {filtered.map((tx, i) => (
                        <div
                            key={tx.id}
                            onClick={() => tx.id && onOpenDrawer(tx.id)}
                            className={cn(
                                'grid items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer',
                                i < filtered.length - 1 && 'border-b border-gray-100 dark:border-gray-700'
                            )}
                            style={{ gridTemplateColumns: ACCOUNT_TX_COLUMNS }}
                        >
                            <span className="text-sm text-muted-foreground tabular-nums">{fmtDate(tx.bookingDate)}</span>
                            <div className="min-w-0">
                                <div className="text-sm font-bold truncate">{tx.counterpartyName || '—'}</div>
                                <div className="text-xs text-muted-foreground truncate">{tx.purpose}</div>
                            </div>
                            <span className="text-right">
                                <SignedAmount amount={tx.amount} currency={tx.currency} size="sm" />
                            </span>
                            <span className="flex justify-center">
                                <BankStatusBadge status={tx.status} />
                            </span>
                            {/* Every row ends with its action: "Zuordnen" while something is open, otherwise the quieter
                                "Ansehen". Both open the same drawer. */}
                            <span className="flex justify-end">
                                <RowAction
                                    variant={tx.status === 'UNMATCHED' || tx.status === 'PARTIALLY_MATCHED' ? 'primary' : 'neutral'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (tx.id) onOpenDrawer(tx.id);
                                    }}
                                >
                                    {tx.status === 'UNMATCHED' || tx.status === 'PARTIALLY_MATCHED' ? t('konten.assign') : t('konten.view')}
                                </RowAction>
                            </span>
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

type ImportWithAccount = IBankImportResponse & { account: BankAccountResponse };

// Only a finished import can be removed — while the worker is still reading the file its rows are incomplete, so the
// backend rejects the rollback for QUEUED/PROCESSING.
const DELETABLE_IMPORT_STATUSES = ['COMPLETED', 'PARTIAL', 'FAILED'];

/**
 * Text of the delete confirmation. Spells out what disappears with the import (its bank transactions) and — when the
 * import's movements are already reconciled — that those links to bookkeeping transactions are removed too. Receipts
 * and bookkeeping transactions themselves survive; only the link between them and the bank movement is lost.
 * <p>
 * Rendered via {@code Trans} so the file name and the counts can be emphasised inside the sentence: the
 * {@code <strong>} tags live in the translation, where each language decides which words they wrap.
 */
function DeleteImportDescription({ target }: { target: ImportWithAccount | null }) {
    if (!target) return null;
    const matched = target.matchedTransactions ?? 0;
    return (
        <>
            <Trans i18nKey="konten.imports.deleteConfirm" count={target.totalTransactions ?? 0} values={{ file: target.fileName ?? '' }} />
            {matched > 0 && (
                <>
                    {' '}
                    <Trans i18nKey="konten.imports.deleteMatchedWarning" count={matched} />
                </>
            )}
        </>
    );
}

// Shared column template of the import table header and rows: Datum, Konto, Datei, Importiert, Duplikate, Zugeordnet,
// Status, delete. The rows keep a minimum width; narrower screens scroll the table horizontally.
const IMPORT_COLUMNS = '104px minmax(130px,.8fr) minmax(200px,1.6fr) 96px 96px 120px 130px 34px';

type ImportFilterStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED';

// Badge per import status. Finished imports use the three filterable states; a running import shows as such.
const IMPORT_STATUS_BADGE: Record<string, { tone: BadgeTone; labelKey: string }> = {
    COMPLETED: { tone: 'pos', labelKey: 'konten.imports.status.completed' },
    PARTIAL: { tone: 'warn', labelKey: 'konten.imports.status.partial' },
    FAILED: { tone: 'neg', labelKey: 'konten.imports.status.failed' },
    PROCESSING: { tone: 'info', labelKey: 'konten.imports.status.processing' },
    QUEUED: { tone: 'neutral', labelKey: 'konten.imports.status.queued' },
};

const importDate = (imp: IBankImportResponse) => new Date(imp.finishedAt ?? imp.importedAt ?? 0).getTime();

/**
 * Read-only overview of past CSV/MT940/CAMT imports: search over file and account names, a status filter and the import
 * table. No import action here; importing happens on the account tab.
 */
function ImporteTab({ accounts }: { accounts: BankAccountResponse[] }) {
    const { t } = useTranslation();
    const rollbackMutation = useRollbackImport();
    const [deleteTarget, setDeleteTarget] = useState<ImportWithAccount | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<ImportFilterStatus[]>([]);
    const [newestFirst, setNewestFirst] = useState(true);

    const importResults = useQueries({
        queries: accounts.map((a) => ({
            queryKey: bankImportKeys.byAccount(a.id!),
            queryFn: () => apiService.orgService.importsAll(a.id!, undefined),
        })),
    });

    const allImports: ImportWithAccount[] = importResults.flatMap((r, i) => (r.data ?? []).map((imp) => ({ ...imp, account: accounts[i] })));
    const isLoading = importResults.some((r) => r.isLoading);

    const needle = search.trim().toLowerCase();
    const matchesSearch = (imp: ImportWithAccount) =>
        !needle || (imp.fileName ?? '').toLowerCase().includes(needle) || (imp.account.name ?? '').toLowerCase().includes(needle);
    // Counts follow the search, so each status shows how many of the searched imports it holds.
    const searched = allImports.filter(matchesSearch);
    const countOf = (status: ImportFilterStatus) => searched.filter((imp) => imp.status === status).length;
    const rows = searched
        .filter((imp) => statusFilter.length === 0 || statusFilter.includes(imp.status as ImportFilterStatus))
        .sort((a, b) => (newestFirst ? importDate(b) - importDate(a) : importDate(a) - importDate(b)));

    const handleDelete = async () => {
        if (!deleteTarget?.id || !deleteTarget.account.id) return;
        await rollbackMutation.mutateAsync({ importId: deleteTarget.id, accountId: deleteTarget.account.id });
        setDeleteTarget(null);
    };

    if (isLoading) return <LoadingState className="py-12" />;

    const headerCls = 'text-[11.5px] font-bold uppercase tracking-[0.06em] text-[var(--ink-faint)]';

    return (
        <div>
            {/* Toolbar: search and status filter */}
            <div className="mb-3.5 flex flex-wrap items-center gap-3">
                <label
                    className="flex h-11 min-w-[240px] flex-1 items-center gap-2.5 border border-border-soft bg-[var(--background-secondary)] px-3.5"
                    style={{ borderRadius: 14 }}
                >
                    <Search size={16} className="flex-shrink-0 text-[var(--ink-faint)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('konten.imports.search')}
                        className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
                    />
                </label>
                <StatusFilterBar
                    ariaLabel={t('konten.table.status')}
                    items={[
                        {
                            id: 'COMPLETED',
                            label: t('konten.imports.status.completed'),
                            count: countOf('COMPLETED'),
                            color: 'var(--positive)',
                            tint: 'var(--positive-surface)',
                        },
                        {
                            id: 'PARTIAL',
                            label: t('konten.imports.status.partial'),
                            count: countOf('PARTIAL'),
                            color: 'var(--warning)',
                            tint: 'var(--warning-surface)',
                        },
                        {
                            id: 'FAILED',
                            label: t('konten.imports.status.failed'),
                            count: countOf('FAILED'),
                            color: 'var(--negative)',
                            tint: 'var(--negative-surface)',
                        },
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                />
            </div>

            <div className="overflow-x-auto rounded-[var(--r-card)]" style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}>
                <div className="min-w-[900px]">
                    {/* Header */}
                    <div className="grid items-center gap-3 border-b border-border-soft px-5 py-[11px]" style={{ gridTemplateColumns: IMPORT_COLUMNS }}>
                        <button
                            type="button"
                            onClick={() => setNewestFirst((v) => !v)}
                            className={cn(headerCls, 'inline-flex items-center gap-1 text-left text-purple-700')}
                        >
                            {t('konten.table.date')}
                            {newestFirst ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                        </button>
                        <span className={headerCls}>{t('konten.imports.account')}</span>
                        <span className={headerCls}>{t('konten.imports.file')}</span>
                        <span className={cn(headerCls, 'text-right')}>{t('konten.imports.imported')}</span>
                        <span className={cn(headerCls, 'text-right')}>{t('konten.imports.duplicates')}</span>
                        <span className={cn(headerCls, 'text-right')}>{t('konten.imports.matched')}</span>
                        <span className={cn(headerCls, 'text-center')}>{t('konten.table.status')}</span>
                        <span className="sr-only">{t('konten.imports.actions')}</span>
                    </div>

                    {rows.length === 0 ? (
                        <p className="px-5 py-10 text-center text-[13.5px] text-muted-foreground">
                            {allImports.length === 0 ? t('konten.imports.empty') : t('konten.imports.noResults')}
                        </p>
                    ) : (
                        rows.map((imp, i) => {
                            const total = imp.totalTransactions ?? 0;
                            const assigned = (imp.matchedTransactions ?? 0) + (imp.ignoredTransactions ?? 0);
                            const complete = total > 0 && assigned >= total;
                            const badge = IMPORT_STATUS_BADGE[imp.status ?? ''];
                            return (
                                <div
                                    key={imp.id}
                                    className={cn('grid items-center gap-3 px-5 py-[13px]', i < rows.length - 1 && 'border-b border-border-soft')}
                                    style={{ gridTemplateColumns: IMPORT_COLUMNS }}
                                >
                                    <span className="text-[13.5px] tabular-nums text-muted-foreground">{fmtDate(imp.finishedAt ?? imp.importedAt)}</span>
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: imp.account.color || 'var(--primary)' }} />
                                        <span className="truncate text-[14px] font-semibold">{imp.account.name}</span>
                                    </span>
                                    <span className="truncate text-[14px] font-bold">{imp.fileName}</span>
                                    <span className="text-right text-[14.5px] font-extrabold tabular-nums">{imp.importedRows ?? 0}</span>
                                    <span
                                        className={cn(
                                            'text-right text-[14px] font-bold tabular-nums',
                                            imp.duplicateRows ? 'text-foreground' : 'text-[var(--ink-faint)]'
                                        )}
                                    >
                                        {imp.duplicateRows || '—'}
                                    </span>
                                    <div className="flex flex-col items-end gap-1.5">
                                        {total > 0 ? (
                                            <>
                                                <span className="text-[14px] font-bold tabular-nums">
                                                    {assigned}/{total}
                                                </span>
                                                <div className="h-[5px] w-[84px] overflow-hidden rounded-full" style={{ background: 'var(--surface-track)' }}>
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${Math.min(100, (assigned / total) * 100)}%`,
                                                            background: complete ? 'var(--positive)' : 'var(--primary)',
                                                        }}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-[14px] font-bold text-[var(--ink-faint)]">—</span>
                                        )}
                                    </div>
                                    <span className="flex justify-center">{badge && <Badge tone={badge.tone}>{t(badge.labelKey)}</Badge>}</span>
                                    <div className="flex justify-end">
                                        {DELETABLE_IMPORT_STATUSES.includes(imp.status ?? '') && (
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(imp)}
                                                aria-label={t('konten.imports.delete')}
                                                className="grid h-[34px] w-[34px] place-items-center rounded-[11px] text-[var(--ink-faint)] transition-colors hover:bg-[var(--negative-surface)] hover:text-[var(--negative)]"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title={t('konten.imports.deleteTitle')}
                description={<DeleteImportDescription target={deleteTarget} />}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={handleDelete}
                destructive
                loading={rollbackMutation.isPending}
            />
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

    const queryClient = useQueryClient();

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
        <div className="flex flex-col gap-6 w-full">
            {/* Page header — same shape as the Belege/Transaktionen pages: title on top, one-line subtitle below. */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-[26px] font-bold text-foreground leading-tight">{t('konten.title')}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t('konten.subtitle')}</p>
                </div>
            </div>

            {/* Bank accounts — collapsed to compact pills by default, expandable to the full cards. The header mirrors
                the collapsible upload panel on the Belege page: icon box + title, then a compact expand/collapse chip.
                When there are no accounts yet the section is forced open so the "add account" card is shown right away. */}
            <div className="flex flex-col gap-3">
                {/* Header + collapse toggle — only meaningful once at least one account exists. */}
                {accounts.length > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
                            <Landmark className="w-[18px] h-[18px]" />
                        </span>
                        <span className="text-sm font-bold text-foreground">
                            {t('konten.accounts')} <span className="text-muted-foreground font-semibold">· {accounts.length}</span>
                        </span>
                        {/* The toggle is a compact chip rather than the whole header row: on a wide page a full-width
                            button puts the chevron far from the label it belongs to, so both live in one pill here. */}
                        <button
                            type="button"
                            onClick={() => setAccountsExpanded((v) => !v)}
                            aria-expanded={accountsExpanded}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-muted-foreground bg-gray-100 dark:bg-gray-800 hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                            {accountsExpanded ? t('konten.accountsCollapse') : t('konten.accountsExpand')}
                            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', accountsExpanded && 'rotate-180')} />
                        </button>
                    </div>
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

            {/* Segmented tab bar. Import now lives next to the filter bar inside each account's own tab, where the
                target account is always unambiguous — no cross-account picker needed. */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
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
            </div>

            {/* Tab content */}
            {tab === 'abgleich' && <AbgleichTab accounts={accounts} onOpenDrawer={openMatchDrawer} />}
            {activeAccount && <AccountTab account={activeAccount} onOpenDrawer={openMatchDrawer} onImport={setImportAccountId} />}
            {tab === 'importe' && <ImporteTab accounts={accounts} />}

            {/* Match drawer */}
            {matchDrawerBankTxId !== null && <MatchDrawer bankTxId={matchDrawerBankTxId} onClose={closeMatchDrawer} />}

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
                onViewTransactions={(id) => setTab(String(id))}
            />
        </div>
    );
}

export default KontenView;
