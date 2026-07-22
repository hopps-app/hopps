import { BankTransactionResponse, DocumentResponse, TransactionResponse } from '@hopps/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Check, ExternalLink, FilePlus, FileText, Landmark, Link2, Loader2, Search, Unlink, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { CreateTransactionDrawer } from '@/components/BankAccounts/CreateTransactionDrawer';
import { DocumentFilePreview } from '@/components/Receipts/DocumentFilePreview';
import { MatchAllocationControl } from '@/components/Transactions/MatchAllocationControl';
import {
    useBankTransaction,
    useAddBankTransactionMatch,
    useRemoveBankTransactionMatch,
    useUpdateBankTransactionMatchAmount,
    useBankTransactionMatches,
    useIgnoreBankTransaction,
    useCreateReceiptForBankTransaction,
    bankTransactionKeys,
} from '@/hooks/queries/useBankAccounts';
import { useDocument } from '@/hooks/queries/useDocuments';
import { cn } from '@/lib/utils';
import apiService from '@/services/ApiService';
import { parseAllocationAmount } from '@/utils/parseAmount';

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
        <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-gray-100 dark:bg-gray-700 text-muted-foreground flex items-center justify-center">
                <Landmark className="w-5 h-5" />
            </div>
            <div className="min-w-0">
                <div className="text-sm font-bold truncate">{tx.counterpartyName || '—'}</div>
                {/* Show the full purpose ("Verwendungszweck") — wrap over as many lines as needed instead of truncating,
                    so a long reference (e.g. customer/invoice numbers) stays fully readable in the summary. */}
                <div className="text-xs text-muted-foreground break-words">
                    {fmtDate(tx.bookingDate)}
                    {tx.purpose ? ` · ${tx.purpose}` : ''}
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
                    isIncoming ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                )}
            >
                {isIncoming ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
                <div className="text-sm font-bold truncate">{tx.name || '—'}</div>
                <div className="text-xs text-muted-foreground">{fmtDate(tx.transactionTime)}</div>
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
    // Called after a receipt was uploaded onto the bank transaction. The parent (Konten page) opens the receipt-review
    // drawer in place so the user completes + confirms the transaction without leaving the bank transactions page.
    onReceiptUploaded?: (doc: DocumentResponse) => void;
}

export function MatchDrawer({ bankTxId, onClose, onReceiptUploaded }: MatchDrawerProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [sel, setSel] = useState<Set<number>>(new Set());
    // Optional per-transaction "amount used" typed at link time (raw input). Only present for rows the user edited;
    // an absent entry means the full/default amount. Lets one collective transfer be split across several transactions.
    const [amounts, setAmounts] = useState<Map<number, string>>(new Map());
    const [showCreate, setShowCreate] = useState(false);
    const [txSearch, setTxSearch] = useState('');
    // The receipt (document) currently previewed to the left of the drawer, chosen via the small receipt button on a
    // candidate row. Only transactions that actually have a linked document can set this.
    const [previewDocId, setPreviewDocId] = useState<number | null>(null);
    const { data: previewDoc } = useDocument(previewDocId ?? undefined);
    const createReceipt = useCreateReceiptForBankTransaction();

    // Drag-and-drop (or click-to-pick) a receipt directly in the drawer. Uploading creates the linked (DRAFT)
    // transaction; the parent then opens the receipt-review drawer in place so the user completes + confirms it and
    // continues with the next bank transaction — all without leaving the Konten page.
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: async (acceptedFiles) => {
            const file = acceptedFiles[0];
            if (!file) return;
            try {
                const doc = await createReceipt.mutateAsync({ bankTxId, file });
                onClose();
                if (doc) onReceiptUploaded?.(doc);
            } catch {
                // The error toast (including the "already uploaded" 409 case) is shown by the mutation's onError;
                // this catch only prevents an unhandled rejection.
            }
        },
        multiple: false,
        accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
        disabled: createReceipt.isPending,
    });

    const { data: bankTx } = useBankTransaction(bankTxId);

    // Full pool — used for the already-linked list and the amount reconciliation.
    const { data: allTx = [] } = useQuery({
        queryKey: ['transactions', 'forMatch'],
        queryFn: () =>
            apiService.orgService.transactionsAll(
                undefined, // bommelId
                undefined, // detached
                undefined, // endDate
                0, // page
                undefined, // privatelyPaid
                undefined, // search
                200, // size
                undefined, // sortBy
                undefined, // sortDir
                undefined, // startDate
                undefined // status
            ),
    });

    // Pre-fill the search with the bank transaction's amount (German decimal comma) so matching transactions surface
    // immediately; the backend search matches both the amount and the name/counterparty text.
    useEffect(() => {
        if (bankTx) {
            const amt = Math.abs(bankTx.amount ?? 0);
            setTxSearch(amt ? amt.toFixed(2).replace('.', ',') : '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bankTx?.id]);

    // Search-driven candidates for the selection list (server-side: amount or text).
    const { data: searchResults = [] } = useQuery({
        queryKey: ['transactions', 'forMatch', 'search', txSearch],
        queryFn: () =>
            apiService.orgService.transactionsAll(
                undefined, // bommelId
                undefined, // detached
                undefined, // endDate
                0, // page
                undefined, // privatelyPaid
                txSearch || undefined, // search
                50, // size
                undefined, // sortBy
                undefined, // sortDir
                undefined, // startDate
                undefined // status
            ),
        enabled: !!bankTx,
    });

    const queryClient = useQueryClient();
    const addMatch = useAddBankTransactionMatch();
    const removeMatch = useRemoveBankTransactionMatch();
    const updateMatchAmount = useUpdateBankTransactionMatchAmount();
    const { data: matchAllocs } = useBankTransactionMatches(bankTxId);
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

    // Candidates from the (amount-prefilled) search, minus already-linked, exact-amount matches first.
    const openTx = searchResults
        .filter((t) => !matchedIds.has(t.id!))
        .sort((a, b) => {
            const aExact = Math.abs(a.total ?? 0) === absAmount ? 0 : 1;
            const bExact = Math.abs(b.total ?? 0) === absAmount ? 0 : 1;
            return aExact - bExact;
        });

    // Already linked hopps transactions
    const linkedTx = allTx.filter((t) => matchedIds.has(t.id!));

    // Lookup across the pool and the current search results so a selected transaction's amount is still counted after
    // the search term changes.
    const txById = new Map<number, TransactionResponse>();
    [...allTx, ...searchResults].forEach((t) => {
        if (t.id != null) txById.set(t.id, t);
    });

    // Allocation (used amount) of each already-linked transaction for THIS bank movement.
    const allocByTx = new Map<number, number>();
    (matchAllocs ?? []).forEach((m) => {
        if (m.transactionId != null) allocByTx.set(m.transactionId, m.amount ?? 0);
    });

    // Default allocation for a candidate: the transaction's full amount — not capped at the movement, so assigning more
    // than the movement holds shows up as visible over-coverage rather than being hidden.
    // Default allocation of this movement to a transaction: as much as the transaction needs, capped at the movement's
    // own amount (a match can't use more of the movement than it holds).
    const movementMagnitude = Math.abs(bankTx.amount ?? 0);
    const defaultAlloc = (t: TransactionResponse) => Math.min(Math.abs(t.total ?? 0), movementMagnitude);
    // A user's per-row override, if it is a valid positive amount within the movement's own amount; otherwise null
    // (fall back to the default). Capping at the movement still lets several movements over-cover a transaction.
    const overrideAlloc = (id: number): number | null => {
        if (!amounts.has(id)) return null;
        const v = parseAllocationAmount(amounts.get(id) ?? '');
        if (v == null || v <= 0 || v > movementMagnitude + 0.005) return null;
        return v;
    };

    // Amount reconciliation (signed: positive tx covers negative bank movement and vice versa), counting the portion
    // actually used for each transaction (its allocation), not the transactions' full totals. A zero-amount transaction
    // ("durchlaufender Posten") has no direction of its own, so its allocation is signed by this movement instead —
    // that lets a single pass-through cover the movement (and its opposite twin) rather than contributing nothing.
    const movementSign = Math.sign(bankTx.amount ?? 0);
    const directionSign = (t: TransactionResponse) => Math.sign(t.total ?? 0) || movementSign;
    const alreadyMatchedSum = linkedTx.reduce((s, t) => {
        const alloc = allocByTx.get(t.id!) ?? Math.abs(t.total ?? 0);
        return s + directionSign(t) * alloc;
    }, 0);
    const selectedSum = Array.from(sel).reduce((s, id) => {
        const t = txById.get(id);
        if (!t) return s;
        return s + directionSign(t) * (overrideAlloc(id) ?? defaultAlloc(t));
    }, 0);
    const remaining = (bankTx.amount ?? 0) - alreadyMatchedSum - selectedSum;
    const isFullyCovered = Math.abs(remaining) <= 0.005; // float tolerance

    const toggle = (id: number) => {
        setSel((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
        // Drop any typed partial amount when a row is toggled (deselecting discards it; reselecting starts fresh).
        setAmounts((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    };

    const setRowAmount = (id: number, value: string) => {
        setAmounts((prev) => {
            const next = new Map(prev);
            if (value === '') {
                next.delete(id);
            } else {
                next.set(id, value);
            }
            return next;
        });
    };

    const handleAssign = async () => {
        for (const txId of sel) {
            await addMatch.mutateAsync({ bankTxId, transactionId: txId, amount: overrideAlloc(txId) ?? undefined });
        }
        setSel(new Set());
        setAmounts(new Map());
        onClose();
    };

    const handleUnlink = async (txId: number) => {
        await removeMatch.mutateAsync({ bankTxId, transactionId: txId });
    };

    const handleUpdateAlloc = async (txId: number, amount: number) => {
        await updateMatchAmount.mutateAsync({ bankTxId, transactionId: txId, amount });
    };

    const handleIgnore = async () => {
        await ignoreTx.mutateAsync(bankTxId);
        onClose();
    };

    return (
        <>
            {/* Scrim */}
            <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

            {/* Linked-receipt preview to the left of the drawer (desktop only), toggled per candidate via its receipt
                button. The wrapper ignores pointer events so clicks in the gap still fall through to the scrim; the
                preview card itself re-enables them. `right` matches the drawer width (max-w-md = 28rem). */}
            <div
                className={cn(
                    'hidden lg:flex fixed top-0 bottom-0 left-0 z-50 p-4 pointer-events-none transition-transform duration-300 ease-out',
                    previewDoc ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ right: '28rem' }}
            >
                {previewDoc && <DocumentFilePreview doc={previewDoc} onClose={() => setPreviewDocId(null)} />}
            </div>

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('konten.drawer.title')}</div>
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
                                        <span
                                            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                            style={{ background: bankTx.bankAccountColor || '#9955CC' }}
                                        />
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

                        {/* Alternative: create a transaction without a receipt, prefilled from the bank movement */}
                        {bankTx.status !== 'IGNORED' && (
                            <button
                                type="button"
                                onClick={() => setShowCreate(true)}
                                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                            >
                                <span className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 text-muted-foreground flex items-center justify-center flex-shrink-0">
                                    <FilePlus className="w-5 h-5" />
                                </span>
                                <span className="flex flex-col min-w-0">
                                    <span className="text-sm font-bold">{t('konten.drawer.createTransaction')}</span>
                                    <span className="text-xs text-muted-foreground">{t('konten.drawer.createTransactionHint')}</span>
                                </span>
                            </button>
                        )}

                        {/* Already linked */}
                        {linkedTx.length > 0 && (
                            <div>
                                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{t('konten.drawer.linked')}</div>
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
                                            <MatchAllocationControl
                                                amount={allocByTx.get(tx.id!) ?? defaultAlloc(tx)}
                                                max={movementMagnitude}
                                                currency={bankTx.currency ?? 'EUR'}
                                                pending={updateMatchAmount.isPending}
                                                onSave={(v) => handleUpdateAlloc(tx.id!, v)}
                                            />
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
                            <div
                                className={cn(
                                    'rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm',
                                    isFullyCovered ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-50 dark:bg-gray-800'
                                )}
                            >
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs text-muted-foreground font-medium">{t('konten.drawer.bankAmount')}</span>
                                    <span className="font-bold tabular-nums">{fmtCurrency(absAmount, bankTx.currency ?? 'EUR')}</span>
                                </div>
                                {alreadyMatchedSum + selectedSum > 0 && (
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
                                    <span className={cn('font-bold tabular-nums', isFullyCovered ? 'text-emerald-600' : 'text-amber-600')}>
                                        {isFullyCovered ? '✓' : (remaining < 0 ? '– ' : '+ ') + fmtCurrency(Math.abs(remaining), bankTx.currency ?? 'EUR')}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Select matching transaction */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('konten.drawer.selectTx')}</div>
                                <span className="text-xs text-muted-foreground">{t('konten.drawer.multiSelect')}</span>
                            </div>

                            {/* Search transactions by amount (pre-filled) or name/counterparty */}
                            <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <input
                                    type="text"
                                    value={txSearch}
                                    onChange={(e) => setTxSearch(e.target.value)}
                                    placeholder={t('konten.drawer.txSearchPlaceholder')}
                                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                                />
                                {txSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setTxSearch('')}
                                        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {openTx.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">{t('konten.drawer.noOpenTx')}</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {openTx.map((tx) => {
                                        const isSelected = sel.has(tx.id!);
                                        const exactMatch = Math.abs(tx.total ?? 0) === Math.abs(bankTx.amount ?? 0);
                                        // The entered "amount used" may not exceed this movement's own amount.
                                        const rowParsed = parseAllocationAmount(amounts.get(tx.id!) ?? '');
                                        const rowOverCap = rowParsed != null && rowParsed > movementMagnitude + 0.005;
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
                                                        isSelected ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'
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
                                                {/* Partial "amount used" for splitting this movement — appears only for a selected row. The
                                                    placeholder shows the default (full) allocation; leave it empty to use that. */}
                                                {isSelected && (
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={amounts.get(tx.id!) ?? ''}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => setRowAmount(tx.id!, e.target.value)}
                                                        placeholder={fmtCurrency(defaultAlloc(tx), bankTx.currency ?? 'EUR')}
                                                        title={t('konten.drawer.usedAmountHint')}
                                                        aria-invalid={rowOverCap}
                                                        className={cn(
                                                            'w-[5.5rem] px-1.5 py-0.5 text-[12px] text-right tabular-nums rounded-md border bg-transparent outline-none flex-shrink-0',
                                                            rowOverCap ? 'border-red-400 focus:border-red-500' : 'border-primary/40 focus:border-primary'
                                                        )}
                                                    />
                                                )}
                                                {/* Toggle the transaction's linked receipt in the left-hand preview. Only shown when a
                                                    document is actually linked; stops propagation so it does not toggle the row selection. */}
                                                {tx.documentId != null && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewDocId((prev) => (prev === tx.documentId ? null : tx.documentId!));
                                                        }}
                                                        aria-pressed={previewDocId === tx.documentId}
                                                        title={previewDocId === tx.documentId ? t('konten.drawer.hideReceipt') : t('konten.drawer.showReceipt')}
                                                        className={cn(
                                                            'w-7 h-7 flex items-center justify-center rounded-full border transition-colors flex-shrink-0',
                                                            previewDocId === tx.documentId
                                                                ? 'border-primary/40 text-primary bg-primary/10'
                                                                : 'border-gray-200 dark:border-gray-600 text-muted-foreground hover:text-primary hover:border-primary/40'
                                                        )}
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {/* Open the bookkeeping transaction's detail view in a new tab, so the
                                                    current assignment context (this bank movement) stays open. */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(`/transactions?id=${tx.id}`, '_blank', 'noopener,noreferrer');
                                                    }}
                                                    title={t('konten.drawer.openTransactionNewTab')}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-600 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors flex-shrink-0"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </button>
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
                            onClick={async () => {
                                await unignoreTx.mutateAsync(bankTxId);
                                onClose();
                            }}
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

            {/* Create a linked transaction (no receipt), prefilled from this bank movement */}
            <CreateTransactionDrawer
                open={showCreate}
                onClose={() => setShowCreate(false)}
                bankTx={bankTx}
                onCreated={() => {
                    // Stay on the Konten page after creating the linked transaction so the user can move straight on to
                    // the next bank movement; the list refreshes via query invalidation.
                    setShowCreate(false);
                    onClose();
                }}
            />
        </>
    );
}
