import { BankImportResponse, BankTransactionResponse } from '@hopps/api-client';
import { ColDef, SortChangedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { ArrowLeft, Edit, Upload, AlertCircle } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { LoadingState } from '@/components/common/LoadingState';
import { BankAccountDrawer } from '@/components/BankAccounts/BankAccountDrawer';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import Progress from '@/components/ui/Progress';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePersistedState } from '@/hooks/usePersistedState';
import {
    useBankAccount,
    useBankTransactionsByAccount,
    useBankImports,
    useRollbackImport,
    type BankTransactionSortField,
} from '@/hooks/queries/useBankAccounts';
import type { SortDirection } from '@/hooks/queries/useTransactions';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number | undefined, currency = 'EUR'): string {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
}

function formatDate(date: string | Date | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE');
}

function ImportStatusBadge({ status }: { status?: string }) {
    const { t } = useTranslation();
    const colorMap: Record<string, string> = {
        QUEUED: 'bg-gray-100 text-gray-700',
        PROCESSING: 'bg-blue-100 text-blue-700',
        COMPLETED: 'bg-emerald-100 text-emerald-700',
        PARTIAL: 'bg-amber-100 text-amber-700',
        FAILED: 'bg-red-100 text-red-700',
    };
    const cls = colorMap[status ?? ''] ?? 'bg-gray-100 text-gray-700';
    return (
        <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', cls)}>
            {t(`bankImport.status.${status ?? 'UNKNOWN'}`, { defaultValue: status ?? '—' })}
        </span>
    );
}

function TransactionStatusBadge({ status }: { status?: string }) {
    const colorMap: Record<string, string> = {
        UNMATCHED: 'bg-gray-100 text-gray-700',
        PARTIALLY_MATCHED: 'bg-amber-100 text-amber-700',
        FULLY_MATCHED: 'bg-emerald-100 text-emerald-700',
        IGNORED: 'bg-red-100 text-red-700',
    };
    const cls = colorMap[status ?? ''] ?? 'bg-gray-100 text-gray-700';
    return (
        <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', cls)}>
            {status ?? '—'}
        </span>
    );
}

function ImportHistoryRow({ imp, accountId, onRollback }: { imp: BankImportResponse; accountId: number; onRollback: () => void }) {
    const { t } = useTranslation();
    const rollbackMutation = useRollbackImport();
    const canRollback = imp.status === 'COMPLETED' || imp.status === 'PARTIAL';
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleRollback = async () => {
        if (!imp.id) return;
        await rollbackMutation.mutateAsync({ importId: imp.id, accountId });
        setConfirmOpen(false);
        onRollback();
    };

    return (
        <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="py-2 px-3 text-sm max-w-[200px] truncate" title={imp.fileName}>{imp.fileName ?? '—'}</td>
            <td className="py-2 px-3 text-sm"><ImportStatusBadge status={imp.status} /></td>
            <td className="py-2 px-3 text-sm min-w-[120px]">
                {imp.status === 'PROCESSING' || imp.status === 'QUEUED' ? (
                    <Progress value={imp.progress ?? 0} className="h-1.5" />
                ) : (
                    <span className="text-muted-foreground">{imp.progress ?? 0}%</span>
                )}
            </td>
            <td className="py-2 px-3 text-sm text-right">{imp.importedRows ?? '—'}</td>
            <td className="py-2 px-3 text-sm text-right">{imp.duplicateRows ?? '—'}</td>
            <td className="py-2 px-3 text-sm text-right">{imp.errorRows ?? '—'}</td>
            <td className="py-2 px-3 text-sm text-muted-foreground">{formatDate(imp.finishedAt)}</td>
            <td className="py-2 px-3 text-sm">
                {canRollback && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmOpen(true)}
                        disabled={rollbackMutation.isPending}
                    >
                        {t('bankImport.rollback.button')}
                    </Button>
                )}
                <ConfirmDialog
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    title={t('bankImport.rollback.title')}
                    description={t('bankImport.rollback.confirm')}
                    confirmLabel={t('bankImport.rollback.button')}
                    cancelLabel={t('common.cancel')}
                    onConfirm={handleRollback}
                    destructive
                    loading={rollbackMutation.isPending}
                />
            </td>
        </tr>
    );
}

export function BankAccountDetailView() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const accountId = Number(id);
    const navigate = useNavigate();
    const [editOpen, setEditOpen] = useState(false);
    const [page] = useState(0);
    const [sortBy, setSortBy] = usePersistedState<BankTransactionSortField>('hopps.konten.account.sortBy', 'bookingDate');
    const [sortDir, setSortDir] = usePersistedState<SortDirection>('hopps.konten.account.sortDir', 'desc');
    const gridRef = useRef<AgGridReact>(null);

    const { data: account, isLoading: accountLoading, refetch: refetchAccount } = useBankAccount(accountId);
    const { data: transactions = [], isLoading: txLoading } = useBankTransactionsByAccount(
        accountId,
        page,
        50,
        undefined,
        sortBy,
        sortDir,
    );
    const { data: imports = [], refetch: refetchImports } = useBankImports(accountId);

    usePageTitle(account?.name ?? t('bankAccounts.title'), 'CardStack');

    const columnDefs = useMemo<ColDef[]>(() => [
        {
            field: 'bookingDate',
            headerName: t('bankAccounts.table.bookingDate'),
            width: 130,
            // Sorting is done server-side; the no-op comparator keeps the order the backend returns while still
            // rendering the sort arrow and firing onSortChanged.
            sortable: true,
            comparator: () => 0,
            sort: 'desc',
            valueFormatter: (p: { value: string }) => formatDate(p.value),
        },
        {
            field: 'counterpartyName',
            headerName: t('bankAccounts.table.counterpartyName'),
            flex: 1,
            minWidth: 150,
            sortable: true,
            comparator: () => 0,
        },
        {
            field: 'purpose',
            headerName: t('bankAccounts.table.purpose'),
            flex: 2,
            minWidth: 200,
            sortable: false,
            cellRenderer: (p: { value: string }) =>
                p.value ? (
                    <span title={p.value} className="block truncate max-w-full">{p.value}</span>
                ) : null,
        },
        {
            field: 'amount',
            headerName: t('bankAccounts.table.amount'),
            width: 140,
            type: 'numericColumn',
            sortable: true,
            comparator: () => 0,
            cellRenderer: (p: { data: BankTransactionResponse }) => {
                const v = p.data.amount;
                if (v === undefined || v === null) return '—';
                const cls = v >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold';
                return (
                    <span className={cls}>
                        {formatCurrency(v, p.data.currency ?? 'EUR')}
                    </span>
                );
            },
        },
        {
            field: 'status',
            headerName: t('bankAccounts.table.status'),
            width: 130,
            sortable: false,
            cellRenderer: (p: { value: string }) => <TransactionStatusBadge status={p.value} />,
        },
    ], [t]);

    const onBtnExport = useCallback(() => {
        gridRef.current?.api?.exportDataAsCsv();
    }, []);

    // Translate the grid's active sort column into the server-side sort params. Only the whitelisted sortable
    // columns can become active, so the cast is safe.
    const onSortChanged = useCallback((e: SortChangedEvent) => {
        const active = e.api.getColumnState().find((c) => c.sort);
        if (active?.colId) {
            setSortBy(active.colId as BankTransactionSortField);
            setSortDir(active.sort as SortDirection);
        }
    }, []);

    if (accountLoading) {
        return <div className="py-12"><LoadingState size="lg" /></div>;
    }

    if (!account) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
                <AlertCircle className="w-12 h-12 text-muted-foreground" />
                <p className="text-lg font-medium">{t('bankAccounts.notFound')}</p>
                <Button variant="outline" onClick={() => navigate('/bank-accounts')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-screen-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                    type="button"
                    onClick={() => navigate('/bank-accounts')}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('bankAccounts.title')}
                </button>

                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                        {account.color && (
                            <span
                                className="inline-block w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                                style={{ backgroundColor: account.color }}
                            />
                        )}
                        <h2 className="text-xl font-bold">{account.name}</h2>
                        {account.iban && (
                            <span className="text-sm text-muted-foreground font-mono">{account.iban}</span>
                        )}
                    </div>

                    <span className={cn(
                        'text-lg font-bold px-3 py-1 rounded-full',
                        (account.balance ?? account.openingBalance ?? 0) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    )}>
                        {formatCurrency(account.balance ?? account.openingBalance, account.currency ?? 'EUR')}
                    </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                        <Edit className="w-4 h-4 mr-1" />
                        {t('common.edit')}
                    </Button>
                    <Button size="sm" onClick={() => navigate(`/bank-accounts/${accountId}/import`)}>
                        <Upload className="w-4 h-4 mr-1" />
                        {t('bankImport.startImport')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/bank-schemas')}>
                        {t('bankAccounts.manageSchemas')}
                    </Button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-gray-800 rounded-[20px] shadow border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-base">{t('bankAccounts.transactions.title')}</h3>
                    <Button variant="outline" size="sm" onClick={onBtnExport}>
                        {t('bankAccounts.transactions.export')}
                    </Button>
                </div>
                {txLoading ? (
                    <div className="py-8"><LoadingState /></div>
                ) : transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">{t('bankAccounts.transactions.empty')}</p>
                ) : (
                    <div className="ag-theme-quartz" style={{ height: 400, width: '100%' }}>
                        <AgGridReact
                            ref={gridRef}
                            rowData={transactions}
                            columnDefs={columnDefs}
                            pagination={false}
                            domLayout="normal"
                            suppressCellFocus
                            sortingOrder={['desc', 'asc']}
                            onSortChanged={onSortChanged}
                        />
                    </div>
                )}
            </div>

            {/* Import History */}
            <div className="bg-white dark:bg-gray-800 rounded-[20px] shadow border border-gray-100 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-base mb-3">{t('bankImport.history.title')}</h3>
                {imports.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">{t('bankImport.history.empty')}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[700px]">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">{t('bankImport.history.fileName')}</th>
                                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">{t('bankImport.history.status')}</th>
                                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">{t('bankImport.history.progress')}</th>
                                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">{t('bankImport.history.imported')}</th>
                                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">{t('bankImport.history.duplicates')}</th>
                                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">{t('bankImport.history.errors')}</th>
                                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">{t('bankImport.history.finishedAt')}</th>
                                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">{t('bankImport.history.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {imports.map((imp) => (
                                    <ImportHistoryRow
                                        key={imp.id}
                                        imp={imp}
                                        accountId={accountId}
                                        onRollback={refetchImports}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit drawer */}
            <BankAccountDrawer
                open={editOpen}
                onOpenChange={setEditOpen}
                account={account}
                onSuccess={() => {
                    refetchAccount();
                    setEditOpen(false);
                }}
            />
        </div>
    );
}

export default BankAccountDetailView;
