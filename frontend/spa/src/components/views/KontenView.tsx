import { BankAccountResponse } from '@hopps/api-client';
import { ArrowLeftRight, ArrowRight, Check, ChevronLeft, ChevronRight, Clock, Edit, Landmark, Link2, Plus, Sheet, Unlink, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';

import { BankAccountDrawer } from '@/components/BankAccounts/BankAccountDrawer';
import { ImportWizardDialog } from '@/components/BankAccounts/ImportWizard';
import { MatchDrawer } from '@/components/BankAccounts/MatchDrawer';
import { LoadingState } from '@/components/common/LoadingState';
import { useBankAccounts, useBankTransactionsByAccount, bankTransactionKeys, bankImportKeys } from '@/hooks/queries/useBankAccounts';
import apiService from '@/services/ApiService';
import { usePageTitle } from '@/hooks/use-page-title';
import { cn } from '@/lib/utils';

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

function SignedAmount({ amount, currency = 'EUR', size = 'base' }: { amount: number | undefined; currency?: string; size?: 'sm' | 'base' | 'lg' }) {
    const pos = (amount ?? 0) >= 0;
    const sizeClass = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base';
    return (
        <span className={cn('font-bold tabular-nums whitespace-nowrap', sizeClass, pos ? 'text-emerald-600' : 'text-foreground')}>
            {pos ? '+ ' : '– '}
            {fmtCurrency(Math.abs(amount ?? 0), currency)}
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
                    <div className="text-[22px] font-black tabular-nums mt-0.5">{fmtCurrency(account.openingBalance, account.currency ?? 'EUR')}</div>
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

// ─── Abgleich Tab ─────────────────────────────────────────────────────────────

function AbgleichTab({ accounts, onOpenDrawer }: { accounts: BankAccountResponse[]; onOpenDrawer: (id: number) => void }) {
    const { t } = useTranslation();

    const txResults = useQueries({
        queries: accounts.map((a) => ({
            queryKey: bankTransactionKeys.byAccount(a.id!, 0, 100),
            queryFn: () => apiService.orgService.byAccount(a.id!, undefined, undefined, 0, undefined, 100),
        })),
    });

    const allTx = txResults.flatMap((r) => r.data ?? []);
    const unmatchedTx = allTx.filter((t) => t.status === 'UNMATCHED' || !t.status);
    const matchedTx = allTx.filter((t) => t.status === 'FULLY_MATCHED');
    const totalOpen = unmatchedTx.length;
    const isLoading = txResults.some((r) => r.isLoading);

    if (isLoading) {
        return <LoadingState className="py-12" />;
    }

    const allReconciled = totalOpen === 0 && allTx.length > 0;

    return (
        <div className="flex flex-col gap-6">
            {/* Status banner */}
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
                                {totalOpen} {totalOpen === 1 ? t('konten.abgleich.openSingular') : t('konten.abgleich.openPlural')}
                                {matchedTx.length > 0 && (
                                    <span className="text-muted-foreground font-semibold">
                                        {' '}
                                        · {matchedTx.length} {t('konten.abgleich.matched')}
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-0.5">{t('konten.abgleich.openDesc')}</div>
                        </>
                    )}
                </div>
            </div>

            {/* Open bookings */}
            {unmatchedTx.length > 0 && (
                <div>
                    <h3 className="font-bold text-[16.5px] mb-3">
                        {t('konten.abgleich.openBookings')} <span className="text-muted-foreground font-semibold">· {unmatchedTx.length}</span>
                    </h3>
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
                                    <SignedAmount amount={tx.amount} currency={tx.currency ?? 'EUR'} />
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
                </div>
            )}

            {/* Empty state when all is reconciled */}
            {allTx.length === 0 && (
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
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [page, setPage] = useState(0);

    const apiStatus = statusFilter === 'ALL' ? undefined : statusFilter;
    const { data: transactions = [], isLoading } = useBankTransactionsByAccount(account.id!, page, PAGE_SIZE, apiStatus);

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
                    {account.openingBalance !== undefined && (
                        <span>
                            · {t('konten.balance')} {fmtCurrency(account.openingBalance, account.currency ?? 'EUR')}
                        </span>
                    )}
                </span>
                <div className="ml-auto flex rounded-xl bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5">
                    {statusFilters.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => { setStatusFilter(f.key); setPage(0); }}
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

            {isLoading ? (
                <LoadingState className="py-8" />
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 flex flex-col items-center text-center gap-2">
                    <Landmark className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t('konten.noTransactions')}</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {/* Header */}
                    <div
                        className="grid text-xs font-bold uppercase tracking-wide text-muted-foreground px-4 py-2.5 border-b border-gray-100 dark:border-gray-700"
                        style={{ gridTemplateColumns: '0.9fr 1.8fr 1.1fr 1.2fr' }}
                    >
                        <span>{t('konten.table.date')}</span>
                        <span>{t('konten.table.counterparty')}</span>
                        <span className="text-right">{t('konten.table.amount')}</span>
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
                                <SignedAmount amount={tx.amount} currency={tx.currency ?? 'EUR'} size="sm" />
                            </span>
                            <span className="flex justify-end">
                                <StatusPill status={tx.status} />
                            </span>
                            {(tx.status === 'UNMATCHED' || tx.status === 'PARTIALLY_MATCHED') && (
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors ml-2"
                                    onClick={(e) => { e.stopPropagation(); tx.id && onOpenDrawer(tx.id); }}
                                >
                                    {t('konten.assign')} <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                    {(page > 0 || filtered.length === PAGE_SIZE) && (
                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40">
                            <span className="text-xs text-muted-foreground">
                                {t('konten.pagination.page', { page: page + 1 })}
                            </span>
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
                                        <span className={cn('tabular-nums text-sm font-medium', matched + ignored === total ? 'text-emerald-600' : 'text-foreground')}>
                                            {matched + ignored}/{total}
                                        </span>
                                        <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                            <div
                                                className={cn('h-full rounded-full transition-all', matched + ignored === total ? 'bg-emerald-500' : 'bg-primary')}
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

    // Open a specific bank transaction's detail drawer when navigated to with ?bankTx= (e.g. from a linked transaction).
    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
        const param = searchParams.get('bankTx');
        if (param) setMatchDrawerBankTxId(Number(param));
    }, [searchParams]);

    const closeMatchDrawer = () => {
        setMatchDrawerBankTxId(null);
        if (searchParams.has('bankTx')) {
            searchParams.delete('bankTx');
            setSearchParams(searchParams, { replace: true });
        }
    };

    // Count open transactions per account for the badges
    const openCountResults = useQueries({
        queries: accounts.map((a) => ({
            queryKey: bankTransactionKeys.byAccount(a.id!, 0, 100),
            queryFn: () => apiService.orgService.byAccount(a.id!, undefined, undefined, 0, undefined, 100),
        })),
    });
    const openCountByAccount = Object.fromEntries(
        accounts.map((a, i) => [String(a.id), (openCountResults[i]?.data ?? []).filter((tx) => !tx.status || tx.status === 'UNMATCHED').length])
    );
    const totalOpen = Object.values(openCountByAccount).reduce((a, b) => a + b, 0);

    const activeAccount = accounts.find((a) => String(a.id) === tab);

    const tabs: { id: TabId; label: string; badge?: number }[] = [
        { id: 'abgleich', label: t('konten.tabs.abgleich'), badge: totalOpen > 0 ? totalOpen : undefined },
        ...accounts.map((a) => ({ id: String(a.id), label: a.name })),
        { id: 'importe', label: t('konten.tabs.importe') },
    ];

    if (isLoading) {
        return <LoadingState className="py-12" />;
    }

    return (
        <div className="flex flex-col gap-6 max-w-screen-xl">
            {/* Page header */}
            <p className="text-muted-foreground text-sm">{t('konten.subtitle')}</p>

            {/* Account cards row */}
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
            {tab === 'abgleich' && <AbgleichTab accounts={accounts} onOpenDrawer={setMatchDrawerBankTxId} />}
            {activeAccount && <AccountTab account={activeAccount} onOpenDrawer={setMatchDrawerBankTxId} />}
            {tab === 'importe' && <ImporteTab accounts={accounts} onImport={setImportAccountId} />}

            {/* Empty state when no accounts at all */}
            {accounts.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 flex flex-col items-center text-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Landmark className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="font-semibold text-base">{t('konten.empty.title')}</p>
                    <p className="text-sm text-muted-foreground max-w-sm">{t('konten.empty.desc')}</p>
                    <button
                        type="button"
                        className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                        onClick={() => setDrawerAccount('new')}
                    >
                        <Plus className="w-4 h-4" />
                        {t('konten.addAccount')}
                    </button>
                </div>
            )}

            {/* Match drawer */}
            {matchDrawerBankTxId !== null && (
                <MatchDrawer
                    bankTxId={matchDrawerBankTxId}
                    onClose={closeMatchDrawer}
                />
            )}

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
