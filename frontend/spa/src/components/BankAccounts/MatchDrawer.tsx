import { BankTransactionResponse, TransactionResponse } from '@hopps/api-client';
import { ArrowDownRight, ArrowUpRight, Check, ExternalLink, Landmark, Link2, Loader2, Unlink, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
    useBankTransaction,
    useAddBankTransactionMatch,
    useRemoveBankTransactionMatch,
    useIgnoreBankTransaction,
    useCreateReceiptForBankTransaction,
    bankTransactionKeys,
} from '@/hooks/queries/useBankAccounts';
import apiService from '@/services/ApiService';
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

// ─── BookingMini ──────────────────────────────────────────────────────────────

function BookingMini({ tx }: { tx: BankTransactionResponse }) {
    return (
        <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-gray-100 dark:bg-gray-700 text-muted-foreground flex items-center justify-center">
                <Landmark className="w-5 h-5" />
            </div>
            <div className="min-w-0">
                <div className="text-sm font-bold truncate">{tx.counterpartyName || '—'}</div>
                <div className="text-xs text-muted-foreground truncate">
                    {fmtDate(tx.bookingDate)} · {tx.purpose}
                </div>
            </div>
        </div>
    );
}

// ─── HoppsTxMini ─────────────────────────────────────────────────────────────

function HoppsTxMini({ tx }: { tx: TransactionResponse }) {
    const isIncoming = (tx.total ?? 0) >= 0;
    return (
        <div className="flex items-center gap-3 min-w-0">
            <div
                className={cn(
                    'w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center',
                    isIncoming
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                )}
            >
                {isIncoming ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
                <div className="text-sm font-bold truncate">{tx.name || '—'}</div>
                <div className="text-xs text-muted-foreground">
                    {tx.categoryName} · {fmtDate(tx.transactionTime)}
                </div>
            </div>
        </div>
    );
}

// ─── SignedAmount ─────────────────────────────────────────────────────────────

function SignedAmount({ amount, currency = 'EUR', size = 'base' }: { amount: number | undefined; currency?: string; size?: 'sm' | 'base' | 'lg' }) {
    const pos = (amount ?? 0) >= 0;
    const sizeClass = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-[13px]' : 'text-base';
    return (
        <span className={cn('font-bold tabular-nums whitespace-nowrap flex-shrink-0', sizeClass, pos ? 'text-emerald-600' : 'text-foreground')}>
            {pos ? '+ ' : '– '}
            {fmtCurrency(Math.abs(amount ?? 0), currency)}
        </span>
    );
}

// ─── MatchDrawer ─────────────────────────────────────────────────────────────

interface MatchDrawerProps {
    bankTxId: number;
    onClose: () => void;
}

export function MatchDrawer({ bankTxId, onClose }: MatchDrawerProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [sel, setSel] = useState<Set<number>>(new Set());
    const createReceipt = useCreateReceiptForBankTransaction();

    // Drag-and-drop (or click-to-pick) a receipt directly in the drawer. Uploading creates the linked transaction and
    // opens the receipt for review.
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: async (acceptedFiles) => {
            const file = acceptedFiles[0];
            if (!file) return;
            const doc = await createReceipt.mutateAsync({ bankTxId, file });
            onClose();
            if (doc?.id) navigate(`/receipts?id=${doc.id}`);
        },
        multiple: false,
        accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
        disabled: createReceipt.isPending,
    });

    const { data: bankTx } = useBankTransaction(bankTxId);

    // Fetch open hopps transactions with same direction
    const { data: allTx = [] } = useQuery({
        queryKey: ['transactions', 'forMatch'],
        queryFn: () => apiService.orgService.transactionsAll(
            undefined, undefined, undefined, undefined, undefined,
            0, undefined, undefined, 200, undefined, undefined
        ),
    });

    const queryClient = useQueryClient();
    const addMatch = useAddBankTransactionMatch();
    const removeMatch = useRemoveBankTransactionMatch();
    const ignoreTx = useIgnoreBankTransaction();
    const unignoreTx = useMutation({
        mutationFn: (id: number) => apiService.orgService.ignoreDELETE(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bankTransactionKeys.all });
            queryClient.invalidateQueries({ queryKey: [...bankTransactionKeys.all, 'detail', bankTxId] });
        },
    });

    if (!bankTx) return null;

    const matchedIds = new Set(bankTx.matchedTransactionIds ?? []);
    const absAmount = Math.abs(bankTx.amount ?? 0);

    // All unlinked Hopps transactions — sort exact-amount matches first
    const openTx = allTx
        .filter((t) => !matchedIds.has(t.id!))
        .sort((a, b) => {
            const aExact = Math.abs(a.total ?? 0) === absAmount ? 0 : 1;
            const bExact = Math.abs(b.total ?? 0) === absAmount ? 0 : 1;
            return aExact - bExact;
        });

    // Already linked hopps transactions
    const linkedTx = allTx.filter((t) => matchedIds.has(t.id!));

    // Amount reconciliation (signed: positive tx covers negative bank movement and vice versa)
    const alreadyMatchedSum = linkedTx.reduce((s, t) => s + (t.total ?? 0), 0);
    const selectedSum = allTx
        .filter((t) => sel.has(t.id!))
        .reduce((s, t) => s + (t.total ?? 0), 0);
    const remaining = (bankTx.amount ?? 0) - alreadyMatchedSum - selectedSum;
    const isFullyCovered = Math.abs(remaining) <= 0.005; // float tolerance

    const toggle = (id: number) => {
        setSel((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleAssign = async () => {
        for (const txId of sel) {
            await addMatch.mutateAsync({ bankTxId, transactionId: txId });
        }
        setSel(new Set());
        onClose();
    };

    const handleUnlink = async (txId: number) => {
        await removeMatch.mutateAsync({ bankTxId, transactionId: txId });
    };

    const handleIgnore = async () => {
        await ignoreTx.mutateAsync(bankTxId);
        onClose();
    };

    return (
        <>
            {/* Scrim */}
            <div
                className="fixed inset-0 bg-black/30 z-40"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {t('konten.drawer.title')}
                    </div>
                    <button
                        type="button"
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={onClose}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 py-5 flex flex-col gap-5">
                        {/* Bank transaction summary */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <BookingMini tx={bankTx} />
                                <SignedAmount amount={bankTx.amount} currency={bankTx.currency ?? 'EUR'} size="base" />
                            </div>
                            <div className="flex gap-2 mt-3 flex-wrap">
                                {bankTx.bankAccountName && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-muted-foreground">
                                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: bankTx.bankAccountColor || '#9955CC' }} />
                                        {bankTx.bankAccountName}
                                    </span>
                                )}
                                {bankTx.transactionType && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-muted-foreground">
                                        {bankTx.transactionType}
                                    </span>
                                )}
                                {bankTx.status === 'IGNORED' && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500">
                                        {t('konten.status.ignored')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Upload a receipt (drag-and-drop or click) → creates & links a pre-filled transaction directly */}
                        {bankTx.status !== 'IGNORED' && (
                            <div
                                {...getRootProps()}
                                className={cn(
                                    'w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed transition-colors text-left cursor-pointer select-none',
                                    isDragActive ? 'border-primary bg-primary/10' : 'border-primary/40 bg-primary/5 hover:bg-primary/10',
                                    createReceipt.isPending && 'opacity-60 pointer-events-none cursor-not-allowed'
                                )}
                            >
                                <input {...getInputProps()} />
                                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                    {createReceipt.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                </span>
                                <span className="flex flex-col min-w-0">
                                    <span className="text-sm font-bold">{t('konten.drawer.uploadReceipt')}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {createReceipt.isPending
                                            ? t('konten.drawer.uploadReceiptBusy')
                                            : isDragActive
                                              ? t('konten.drawer.uploadReceiptDrop')
                                              : t('konten.drawer.uploadReceiptHint')}
                                    </span>
                                </span>
                            </div>
                        )}

                        {/* Already linked */}
                        {linkedTx.length > 0 && (
                            <div>
                                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                                    {t('konten.drawer.linked')}
                                </div>
                                <div className="flex flex-col gap-2">
                                    {linkedTx.map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 flex items-center gap-3"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/transactions?id=${tx.id}`)}
                                                title={t('konten.drawer.openTransaction')}
                                                className="flex-1 min-w-0 flex items-center gap-3 text-left group"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <HoppsTxMini tx={tx} />
                                                </div>
                                                <SignedAmount amount={tx.total} currency={tx.currencyCode ?? 'EUR'} size="sm" />
                                                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                                            </button>
                                            <button
                                                type="button"
                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                                                onClick={() => handleUnlink(tx.id!)}
                                                title={t('konten.drawer.unlink')}
                                            >
                                                <Unlink className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Amount reconciliation summary */}
                        {bankTx.status !== 'IGNORED' && (
                            <div className={cn(
                                'rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm',
                                isFullyCovered
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'bg-gray-50 dark:bg-gray-800'
                            )}>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs text-muted-foreground font-medium">{t('konten.drawer.bankAmount')}</span>
                                    <span className="font-bold tabular-nums">{fmtCurrency(absAmount, bankTx.currency ?? 'EUR')}</span>
                                </div>
                                {(alreadyMatchedSum + selectedSum) > 0 && (
                                    <div className="flex flex-col gap-0.5 text-right">
                                        <span className="text-xs text-muted-foreground font-medium">{t('konten.drawer.covered')}</span>
                                        <span className="font-bold tabular-nums text-emerald-600">
                                            {fmtCurrency(alreadyMatchedSum + selectedSum, bankTx.currency ?? 'EUR')}
                                        </span>
                                    </div>
                                )}
                                <div className="flex flex-col gap-0.5 text-right">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {isFullyCovered ? t('konten.drawer.fullyCovered') : t('konten.drawer.remaining')}
                                    </span>
                                    <span className={cn(
                                        'font-bold tabular-nums',
                                        isFullyCovered ? 'text-emerald-600' : 'text-amber-600'
                                    )}>
                                        {isFullyCovered
                                            ? '✓'
                                            : (remaining < 0 ? '– ' : '+ ') + fmtCurrency(Math.abs(remaining), bankTx.currency ?? 'EUR')}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Select matching transaction */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    {t('konten.drawer.selectTx')}
                                </div>
                                <span className="text-xs text-muted-foreground">{t('konten.drawer.multiSelect')}</span>
                            </div>

                            {openTx.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">
                                    {t('konten.drawer.noOpenTx')}
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {openTx.map((tx) => {
                                        const isSelected = sel.has(tx.id!);
                                        const exactMatch = Math.abs(tx.total ?? 0) === Math.abs(bankTx.amount ?? 0);
                                        return (
                                            <div
                                                key={tx.id}
                                                onClick={() => toggle(tx.id!)}
                                                className={cn(
                                                    'bg-white dark:bg-gray-800 rounded-xl border p-3 flex items-center gap-3 cursor-pointer transition-all',
                                                    isSelected
                                                        ? 'border-primary shadow-[0_0_0_3px_var(--color-primary)/0.15]'
                                                        : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                                                )}
                                            >
                                                {/* Checkbox */}
                                                <div
                                                    className={cn(
                                                        'w-5 h-5 rounded-md flex-shrink-0 border-2 flex items-center justify-center transition-colors',
                                                        isSelected
                                                            ? 'bg-primary border-primary'
                                                            : 'border-gray-300 dark:border-gray-600'
                                                    )}
                                                >
                                                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <HoppsTxMini tx={tx} />
                                                </div>
                                                {exactMatch && (
                                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 flex-shrink-0">
                                                        {t('konten.drawer.exactMatch')}
                                                    </span>
                                                )}
                                                <SignedAmount amount={tx.total} currency={tx.currencyCode ?? 'EUR'} size="sm" />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 flex-shrink-0">
                    {bankTx.status === 'IGNORED' ? (
                        <button
                            type="button"
                            className="px-3 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                            onClick={async () => { await unignoreTx.mutateAsync(bankTxId); onClose(); }}
                            disabled={unignoreTx.isPending}
                        >
                            {t('konten.drawer.unignore')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={handleIgnore}
                            disabled={ignoreTx.isPending}
                        >
                            {t('konten.drawer.ignore')}
                        </button>
                    )}
                    <div className="flex-1" />
                    {bankTx.status !== 'IGNORED' && (
                        <button
                            type="button"
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                                sel.size > 0
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    : 'bg-gray-100 dark:bg-gray-700 text-muted-foreground cursor-not-allowed'
                            )}
                            disabled={sel.size === 0 || addMatch.isPending}
                            onClick={handleAssign}
                        >
                            <Link2 className="w-4 h-4" />
                            {t('konten.drawer.assign')}
                            {sel.size > 0 && ` (${sel.size})`}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
