import { TransactionResponse, TransactionStatus, TransactionUpdateRequest } from '@hopps/api-client';
import {
    ArrowDownRight,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    X,
    Plus,
    Search,
    FileText,
    Trash2,
    Pencil,
    Check,
    Minus,
    Upload,
    Filter,
    Wallet,
    ExternalLink,
    RotateCcw,
    Link2,
    Unlink,
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { CreateTransactionDrawer } from '@/components/BankAccounts/CreateTransactionDrawer';
import CategoryGroupFields from '@/components/CategoryGroups/CategoryGroupFields';
import { buildBommelIndex, missingRequiredGroups } from '@/components/CategoryGroups/helpers';
import TransactionCategoryFilter, { type CategoryFilterRow } from '@/components/CategoryGroups/TransactionCategoryFilter';
import { ALL_BOMMELS, BommelSelect, BommelSelection } from '@/components/Dashboard/BommelSelect';
import { collectSubtreeIds, flattenBommelTree } from '@/components/Dashboard/bommelTree';
import { getLastBommelId } from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector';
import { DeleteTransactionDialog } from '@/components/Receipts/DeleteTransactionDialog';
import { DocumentFilePreview } from '@/components/Receipts/DocumentFilePreview';
import { BankMatchSection } from '@/components/Transactions/BankMatchSection';
import { FONT, HIDE_BOMMEL_QUERY, TX_GRID, TX_GRID_NARROW } from '@/components/Transactions/layout';
import { DrawerSkeleton, TableSkeleton } from '@/components/Transactions/TransactionsSkeleton';
import { HintTooltip } from '@/components/ui/HintTooltip';
import { SortHeader } from '@/components/ui/SortHeader';
import TextField from '@/components/ui/TextField';
import { useBankTransactionsForTransaction } from '@/hooks/queries/useBankAccounts';
import { useCategoryGroups } from '@/hooks/queries/useCategoryGroups';
import { useDeleteDocument, useDocument } from '@/hooks/queries/useDocuments';
import {
    useTransactions,
    useTransactionAggregate,
    useTransaction,
    useDeleteTransaction,
    useUpdateTransaction,
    useConfirmTransaction,
    useReopenTransaction,
    TransactionFilters,
    TransactionSortBy,
    SortDirection,
} from '@/hooks/queries/useTransactions';
import { useMediaQuery } from '@/hooks/use-media-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { usePersistedState } from '@/hooks/usePersistedState';
import { getTransactionConfirmState } from '@/lib/transactionConfirm';
import { cn } from '@/lib/utils';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

// ─── Design tokens ───────────────────────────────────────────────────────────
// The prototype's fixed palette now lives in styles/index.css, once per theme, so this view renders
// in dark mode as well. The mapping:
// surface: --background-secondary · sunken: --surface-sunken · track: --surface-track
// ink: --foreground · ink-2: --muted-foreground · ink-3: --ink-faint
// line: --border-soft · strong line: --border-strong · purple: --primary / --purple-700
// purple tint: --accent-surface · positive/negative/warning: --positive · --negative · --warning
// (each with a matching --*-surface, and --negative-solid for the filled destructive button)
// font: "Hanken Grotesk"
// radius-card: 18px · radius-md: 14px · radius-sm: 10px

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

function fmtDate(date: Date | string | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Micro components ─────────────────────────────────────────────────────────

function Badge({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: 'pos' | 'neg' | 'warn' | 'neutral' | 'purple' }) {
    const styles: Record<string, string> = {
        pos: 'bg-[var(--positive-surface)] text-[var(--positive)]',
        neg: 'bg-[var(--negative-surface)] text-[var(--negative)]',
        warn: 'bg-[var(--warning-surface)] text-[var(--warning)]',
        neutral: 'bg-[var(--surface-track)] text-muted-foreground',
        purple: 'bg-[var(--accent-surface)] text-purple-700',
    };
    return (
        <span
            className={cn('inline-flex items-center gap-1.5 text-[12.5px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap', styles[variant])}
            style={{ fontFamily: FONT }}
        >
            {children}
        </span>
    );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-purple-700" style={{ fontFamily: FONT }}>
            {children}
        </span>
    );
}

function StatusBadge({ status }: { status?: TransactionStatus }) {
    const { t } = useTranslation();
    if (status === 'CONFIRMED') {
        return (
            <Badge variant="pos">
                <Check size={11} strokeWidth={2.5} />
                {t('transactions.status.confirmed')}
            </Badge>
        );
    }
    return <Badge variant="warn">{t('transactions.status.draft')}</Badge>;
}

function TxIcon({ size = 36, incoming }: { size?: number; incoming?: boolean }) {
    // Use purple tint for expense (outgoing), green tint for income
    const bg = incoming ? 'var(--positive-surface)' : 'var(--accent-surface)';
    const color = incoming ? 'var(--positive)' : 'var(--purple-700)';
    const Icon = incoming ? ArrowUpRight : ArrowDownRight;
    return (
        <span className="inline-flex items-center justify-center flex-shrink-0" style={{ width: size, height: size, borderRadius: 10, background: bg, color }}>
            <Icon size={Math.round(size * 0.47)} strokeWidth={2} />
        </span>
    );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span
            className="inline-flex cursor-default items-center gap-1.5 rounded-xl bg-[var(--accent-surface)] px-3 py-1.5 text-[13px] font-semibold text-purple-700"
            style={{ fontFamily: FONT }}
        >
            {label}
            <button onClick={onRemove} className="text-primary transition-colors hover:text-[var(--negative)]">
                <X size={12} strokeWidth={2.5} />
            </button>
        </span>
    );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function TransactionDrawer({ txId, onClose, onDeleted }: { txId: number | null; onClose: () => void; onDeleted: () => void }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: tx, isLoading } = useTransaction(txId ?? 0);
    // The receipt linked to this transaction (if any) — shown as a large preview to the left of the drawer,
    // mirroring the receipt detail view. Fetching is gated on documentId (the hook no-ops when it's undefined).
    const { data: linkedDoc } = useDocument(tx?.documentId ?? undefined);
    const deleteMutation = useDeleteTransaction();
    const deleteDocumentMutation = useDeleteDocument();
    const updateMutation = useUpdateTransaction();
    const confirmMutation = useConfirmTransaction();
    const reopenMutation = useReopenTransaction();
    // The bank transaction(s) matched to this transaction — used to gate the confirm action on full coverage.
    const { data: linkedBankTxns = [] } = useBankTransactionsForTransaction(txId ?? undefined);
    const { organization } = useStore();
    const allBommels = useBommelsStore((s) => s.allBommels);
    const drawerRootBommel = useBommelsStore((s) => s.rootBommel);
    const loadBommels = useBommelsStore((s) => s.loadBommels);
    const drawerBommelItems = useMemo(() => flattenBommelTree(allBommels, drawerRootBommel?.id), [allBommels, drawerRootBommel?.id]);
    const [editMode, setEditMode] = useState(false);
    const open = txId !== null;

    // The bommel store is populated on-demand per view; make sure it's loaded while the drawer is open so the bommel
    // selector isn't empty (e.g. when arriving here right after creating a transaction from a bank movement).
    useEffect(() => {
        if (open && organization?.id && allBommels.length === 0) {
            loadBommels(organization.id);
        }
    }, [open, organization?.id, allBommels.length, loadBommels]);

    // Edit form state
    const [kind, setKind] = useState<'expense' | 'income'>('expense');
    const [name, setName] = useState('');
    const [amountStr, setAmountStr] = useState('');
    const [date, setDate] = useState('');
    const [senderName, setSenderName] = useState('');
    const [bommelId, setBommelId] = useState('');
    const [privatelyPaid, setPrivatelyPaid] = useState(false);
    const [categoryValues, setCategoryValues] = useState<Record<number, string>>({});
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const { data: categoryGroups = [] } = useCategoryGroups();
    const { showError } = useToast();

    // Tracks the transaction id we have already auto-opened in edit mode, so cancelling/saving
    // a draft does not immediately re-enter edit mode.
    const autoEditedRef = useRef<number | null>(null);

    // Reset edit mode whenever a different transaction is opened
    useEffect(() => {
        setEditMode(false);
        setConfirmDeleteOpen(false);
        autoEditedRef.current = null;
    }, [txId]);

    // Unconfirmed (draft) transactions open directly in edit mode with all fields editable
    // and the bank transaction linking available, so the user can complete them in one step.
    useEffect(() => {
        if (!tx || tx.id == null || tx.id !== txId) return;
        if (autoEditedRef.current === txId) return;
        if (tx.status === 'DRAFT') {
            autoEditedRef.current = txId;
            startEdit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tx, txId]);

    function startEdit() {
        if (!tx) return;
        const total = tx.total != null ? Number(tx.total) : 0;
        setKind(total < 0 ? 'expense' : 'income');
        setName(tx.name ?? '');
        setAmountStr(tx.total != null ? String(Math.abs(total)) : '');
        setDate(tx.transactionTime ? new Date(tx.transactionTime).toISOString().slice(0, 10) : '');
        setSenderName(tx.senderName ?? '');
        // Keep the transaction's own bommel; if it has none, default to the last picked one (batch assignment).
        const lastBommel = getLastBommelId();
        setBommelId(tx.bommelId != null ? String(tx.bommelId) : lastBommel ? String(lastBommel) : '');
        setPrivatelyPaid(tx.privatelyPaid ?? false);
        const cv: Record<number, string> = {};
        (tx.categoryValues ?? []).forEach((c) => {
            if (c.groupId != null && c.value != null) {
                cv[c.groupId] = c.value;
            }
        });
        setCategoryValues(cv);
        setEditMode(true);
    }

    /** Returns false and shows a toast when a required, applicable category group has no value yet. */
    function categoriesComplete(): boolean {
        const missing = missingRequiredGroups(categoryGroups, bommelId ? Number(bommelId) : null, buildBommelIndex(allBommels), categoryValues);
        if (missing.length > 0) {
            showError(t('categoryGroups.fields.missing', { groups: missing.map((g) => g.name).join(', ') }));
            return false;
        }
        return true;
    }

    // Writes the current edit-form values onto the transaction (kept as-is; a draft can always be saved incomplete).
    async function persistEdits() {
        if (!tx?.id) return;
        // An empty (or invalid) amount clears the field: omit the total so the backend receives null and empties it,
        // instead of silently keeping the old value. The euro amount can later be filled from a linked bank transaction.
        const trimmed = amountStr.trim();
        const raw = parseFloat(trimmed.replace(',', '.'));
        const signed = trimmed === '' || isNaN(raw) ? undefined : kind === 'expense' ? -Math.abs(raw) : Math.abs(raw);
        const data = new TransactionUpdateRequest({
            name: name || undefined,
            total: signed,
            transactionDate: date || undefined,
            senderName: senderName || undefined,
            bommelId: bommelId ? Number(bommelId) : 0,
            privatelyPaid,
            categoryValues,
        });
        await updateMutation.mutateAsync({ id: tx.id, data });
    }

    async function handleSave() {
        // Draft save: required category groups are not enforced here (only at confirm), like the other fields.
        await persistEdits();
        setEditMode(false);
        // Return to the transactions table instead of the read-only detail view — collapse the drawer.
        onClose();
    }

    // Save the edits and immediately confirm — the confirm button is only enabled when confirmState.canConfirm, so
    // the backend guard passes.
    async function handleSaveAndConfirm() {
        if (!tx?.id) return;
        if (!categoriesComplete()) return;
        await persistEdits();
        await confirmMutation.mutateAsync(tx.id);
        // Close the drawer and go back to the transactions list instead of showing the read-only detail view.
        setEditMode(false);
        onClose();
    }

    // Deleting the document takes its transaction with it, so "with receipt" is a single call to the document endpoint.
    async function handleDelete(withReceipt: boolean) {
        if (!txId) return;
        if (withReceipt && tx?.documentId != null) {
            await deleteDocumentMutation.mutateAsync(tx.documentId);
        } else {
            await deleteMutation.mutateAsync(txId);
        }
        setConfirmDeleteOpen(false);
        onDeleted();
        onClose();
    }

    async function handleConfirm() {
        if (!tx?.id) return;
        await confirmMutation.mutateAsync(tx.id);
        // Back to the list after confirming, rather than staying in the (now read-only) detail view.
        onClose();
    }

    async function handleReopen() {
        if (!tx?.id) return;
        await reopenMutation.mutateAsync(tx.id);
    }

    const amount = tx?.total ? Number(tx.total) : 0;

    // Whether the transaction may be confirmed, plus the list of still-missing requirements for the tooltip. In edit
    // mode the live form values are used (so the button reacts to unsaved edits); otherwise the saved values.
    const parsedEditAmount = parseFloat(amountStr.replace(',', '.'));
    const confirmState = getTransactionConfirmState(
        editMode
            ? {
                  // Signed by the edit-form direction so a directional mismatch with the linked bank movement blocks confirm.
                  amount: isNaN(parsedEditAmount) ? null : kind === 'expense' ? -Math.abs(parsedEditAmount) : Math.abs(parsedEditAmount),
                  date: date || null,
                  counterparty: senderName || null,
                  name: name || null,
                  bommelId: bommelId ? Number(bommelId) : null,
              }
            : {
                  amount: tx?.total != null ? Number(tx.total) : null,
                  date: tx?.transactionTime ? new Date(tx.transactionTime).toISOString().slice(0, 10) : null,
                  counterparty: tx?.senderName || null,
                  name: tx?.name || null,
                  bommelId: tx?.bommelId ?? null,
              },
        linkedBankTxns
    );
    // Required category groups that apply to the (selected) bommel but have no value yet also block confirming — mirrors
    // the backend confirm guard. Uses the live edit-form bommel/values in edit mode, the saved ones otherwise.
    const missingConfirmGroups = useMemo(() => {
        const bId = editMode ? (bommelId ? Number(bommelId) : null) : (tx?.bommelId ?? null);
        const values = editMode
            ? categoryValues
            : Object.fromEntries(
                  (tx?.categoryValues ?? []).filter((c) => c.groupId != null && c.value != null).map((c) => [c.groupId as number, c.value as string])
              );
        return missingRequiredGroups(categoryGroups, bId, buildBommelIndex(allBommels), values);
    }, [editMode, bommelId, tx, categoryValues, categoryGroups, allBommels]);

    const canConfirm = confirmState.canConfirm && missingConfirmGroups.length === 0;
    const confirmBlockers = canConfirm ? null : (
        <>
            <span className="font-bold">{t('transactions.confirmBlockers.title')}</span>
            <span className="block mt-0.5">
                {[...confirmState.missing.map((m) => t(`transactions.confirmBlockers.${m}`)), ...missingConfirmGroups.map((g) => g.name)].join(', ')}
            </span>
        </>
    );

    const inputCls =
        'h-10 w-full rounded-xl border border-border-soft bg-[var(--background-secondary)] px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground transition-shadow focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-surface)]';
    const labelCls = 'block text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink-faint)] mb-1';

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn('fixed inset-0 bg-black/25 z-40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
                onClick={onClose}
            />

            {/* Large file preview to the left of the detail drawer (desktop only), shown when a receipt is linked. */}
            <div
                className={cn(
                    'hidden lg:flex fixed top-0 bottom-0 left-0 z-50 p-4 pointer-events-none transition-transform duration-300 ease-out',
                    open && linkedDoc ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ right: 420, fontFamily: FONT }}
            >
                {linkedDoc && <DocumentFilePreview doc={linkedDoc} />}
            </div>

            {/* Drawer */}
            <div
                className={cn(
                    'fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : 'translate-x-full'
                )}
                style={{
                    width: 420,
                    maxWidth: '100vw',
                    background: 'var(--background-secondary)',
                    boxShadow: '0 12px 40px rgba(20,20,40,.16)',
                    fontFamily: FONT,
                }}
            >
                {/* Sticky header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border-soft" style={{ background: 'var(--background-secondary)' }}>
                    <Eyebrow>{editMode ? t('transactions.detail.editTitle') : t('transactions.detail.title')}</Eyebrow>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-border-soft text-muted-foreground hover:text-foreground hover:border-purple-300 transition-colors"
                    >
                        <X size={17} />
                    </button>
                </div>

                {isLoading || !tx ? (
                    <DrawerSkeleton />
                ) : !editMode ? (
                    <div className="flex-1 overflow-y-auto">
                        {/* Hero */}
                        <div className="px-6 pt-7 pb-6 flex flex-col items-center text-center border-b border-border-soft">
                            <TxIcon size={52} incoming={amount >= 0} />
                            <h2 className="mt-4 font-bold text-foreground leading-snug" style={{ fontSize: 20 }}>
                                {tx.name ?? '—'}
                            </h2>
                            {tx.senderName && <p className="mt-1 text-[13.5px] text-muted-foreground">{tx.senderName}</p>}
                            <p
                                className="mt-4 font-bold tabular-nums leading-none"
                                style={{ fontSize: 38, color: amount >= 0 ? 'var(--positive)' : 'var(--negative)' }}
                            >
                                {fmtCurrency(amount)}
                            </p>
                            <div className="mt-3">
                                <StatusBadge status={tx.status} />
                            </div>
                        </div>

                        {/* Details */}
                        <div className="px-6 py-5 border-b border-border-soft">
                            <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 12, columnGap: 16 }}>
                                {[
                                    [t('transactions.detail.bommel'), tx.bommelName ?? '—'],
                                    [t('transactions.detail.date'), fmtDate(tx.transactionTime)],
                                    [t('transactions.detail.privatelyPaid'), tx.privatelyPaid ? t('transactions.detail.yes') : t('transactions.detail.no')],
                                    ...(tx.categoryValues ?? [])
                                        .filter((c) => c.value)
                                        .map((c) => [
                                            categoryGroups.find((g) => g.id === c.groupId)?.name ?? t('categoryGroups.fields.eyebrow'),
                                            c.value ?? '—',
                                        ]),
                                ].map(([label, value]) => (
                                    <>
                                        <dt className="text-[13.5px] text-muted-foreground">{label}</dt>
                                        <dd className="text-[13.5px] font-semibold text-foreground text-right">{value}</dd>
                                    </>
                                ))}
                            </dl>
                        </div>

                        {/* Beleg */}
                        <div className="px-6 py-5 border-b border-border-soft">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText size={15} className="text-purple-700" />
                                <span className="text-[14px] font-bold text-foreground">{t('transactions.detail.receipt')}</span>
                            </div>
                            {tx.documentId ? (
                                <button
                                    onClick={() => navigate(`/receipts?id=${tx.documentId}`)}
                                    className="w-full flex items-center gap-3 p-3 rounded-[10px] border border-border-soft text-left transition-colors hover:border-purple-300 hover:bg-[var(--accent-surface)]"
                                    style={{ background: 'var(--surface-sunken)' }}
                                >
                                    <Badge variant="neutral">PDF</Badge>
                                    <span className="flex-1 text-[13px] text-foreground truncate">
                                        {linkedDoc?.fileName ?? `${t('transactions.detail.receipt')} #${tx.documentId}`}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-purple-700 flex-shrink-0">
                                        {t('transactions.detail.openReceipt')}
                                        <ExternalLink size={13} />
                                    </span>
                                </button>
                            ) : (
                                <div
                                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-[14px] border-2 border-dashed text-center"
                                    style={{ borderColor: 'var(--border-soft)' }}
                                >
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-surface)' }}>
                                        <Upload size={20} className="text-purple-700" />
                                    </div>
                                    <p className="text-[13px] text-muted-foreground">{t('transactions.detail.noReceipt')}</p>
                                </div>
                            )}
                        </div>

                        {/* Zahlung & Abgleich */}
                        <BankMatchSection tx={tx} />
                    </div>
                ) : (
                    /* Edit form */
                    <div className="flex-1 overflow-y-auto">
                        <div className="px-6 py-5 space-y-4">
                            {/* Direction */}
                            <div>
                                <label className={labelCls}>{t('transactions.create.direction')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['expense', 'income'] as const).map((d) => {
                                        const active = kind === d;
                                        const Icon = d === 'expense' ? ArrowDownRight : ArrowUpRight;
                                        const c =
                                            d === 'expense'
                                                ? {
                                                      bg: 'var(--negative-surface)',
                                                      border: 'var(--negative-border)',
                                                      text: 'var(--negative)',
                                                      iconBg: 'var(--negative-surface-strong)',
                                                  }
                                                : {
                                                      bg: 'var(--positive-surface)',
                                                      border: 'var(--positive-border)',
                                                      text: 'var(--positive)',
                                                      iconBg: 'var(--positive-surface-strong)',
                                                  };
                                        return (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => setKind(d)}
                                                className="flex items-center gap-2.5 p-3 rounded-[12px] border-2 transition-all text-left"
                                                style={{
                                                    borderColor: active ? c.border : 'var(--border-soft)',
                                                    background: active ? c.bg : 'var(--surface-sunken)',
                                                }}
                                            >
                                                <span
                                                    className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
                                                    style={{
                                                        background: active ? c.iconBg : 'var(--surface-track)',
                                                        color: active ? c.text : 'var(--ink-faint)',
                                                    }}
                                                >
                                                    <Icon size={16} strokeWidth={2} />
                                                </span>
                                                <span className="font-bold text-[13.5px]" style={{ color: active ? c.text : 'var(--muted-foreground)' }}>
                                                    {t(`transactions.create.${d}`)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Amount + Date */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>{t('transactions.create.amount')}</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={amountStr}
                                        onChange={(e) => setAmountStr(e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>{t('transactions.detail.date')}</label>
                                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className={labelCls}>{t('transactions.create.name')}</label>
                                <TextField value={name} onValueChange={setName} />
                            </div>

                            {/* Sender — labelled by direction: income means the counterparty is the recipient. */}
                            <div>
                                <label className={labelCls}>{kind === 'income' ? t('transactions.create.recipient') : t('transactions.create.issuer')}</label>
                                <TextField value={senderName} onValueChange={setSenderName} />
                            </div>

                            {/* Bommel */}
                            <div>
                                <label className={labelCls}>{t('transactions.detail.bommel')}</label>
                                <BommelSelect
                                    items={drawerBommelItems}
                                    value={bommelId ? Number(bommelId) : ALL_BOMMELS}
                                    emptyLabel={t('invoiceUpload.selectBommel')}
                                    onChange={(next) => setBommelId(next === ALL_BOMMELS ? '' : String(next))}
                                    triggerClassName="sm:w-full rounded-xl border-border-soft shadow-none hover:shadow-none"
                                />
                            </div>

                            {/* Category groups (applicable to the selected bommel) */}
                            <CategoryGroupFields
                                bommelId={bommelId ? Number(bommelId) : null}
                                values={categoryValues}
                                onChange={(groupId, value) =>
                                    setCategoryValues((prev) => {
                                        const next = { ...prev };
                                        if (value == null || value === '') {
                                            delete next[groupId];
                                        } else {
                                            next[groupId] = value;
                                        }
                                        return next;
                                    })
                                }
                            />

                            {/* Privately paid */}
                            <button
                                type="button"
                                onClick={() => setPrivatelyPaid((v) => !v)}
                                className="w-full flex items-center gap-3 p-3 rounded-[12px] border-2 transition-all text-left"
                                style={{
                                    borderColor: privatelyPaid ? 'var(--primary)' : 'var(--border-soft)',
                                    background: privatelyPaid ? 'var(--accent-surface)' : 'var(--surface-sunken)',
                                }}
                            >
                                <span
                                    className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
                                    style={{ background: privatelyPaid ? 'var(--accent-surface-strong)' : 'var(--surface-track)' }}
                                >
                                    {privatelyPaid ? (
                                        <Check size={16} strokeWidth={2.5} color="var(--purple-700)" />
                                    ) : (
                                        <span className="w-4 h-4 rounded border-2 border-[var(--border-strong)]" />
                                    )}
                                </span>
                                <span className="text-[13.5px] font-bold" style={{ color: privatelyPaid ? 'var(--purple-700)' : 'var(--foreground)' }}>
                                    {t('transactions.detail.privatelyPaid')}
                                </span>
                            </button>
                        </div>

                        {/* Zahlung & Abgleich – Banktransaktionen direkt beim Bearbeiten verknüpfen. currentTotal feeds
                            the live edited amount+direction so the reconciliation difference updates immediately when
                            income↔expense is flipped (the sign reverses), before the change is saved. */}
                        <div className="border-t border-border-soft">
                            <BankMatchSection
                                tx={tx}
                                currentTotal={(() => {
                                    const raw = parseFloat(amountStr.trim().replace(',', '.'));
                                    if (amountStr.trim() === '' || isNaN(raw)) return null;
                                    return kind === 'expense' ? -Math.abs(raw) : Math.abs(raw);
                                })()}
                            />
                        </div>
                    </div>
                )}

                {/* Sticky footer */}
                {tx && !isLoading && (
                    <div className="px-6 py-4 border-t border-border-soft flex items-center gap-2" style={{ background: 'var(--background-secondary)' }}>
                        {editMode ? (
                            <>
                                <button
                                    onClick={() => setEditMode(false)}
                                    className="px-4 py-2 rounded-full text-[14px] font-bold border border-border-soft text-muted-foreground hover:bg-[var(--surface-sunken)] transition-colors"
                                >
                                    {t('transactions.detail.cancel')}
                                </button>
                                <div className="flex-1" />
                                {/* Saving is always allowed — a draft may stay incomplete. For a draft, Save is the
                                    secondary action and Confirm (gated) the primary one; a confirmed transaction being
                                    edited only offers Save. */}
                                <button
                                    onClick={handleSave}
                                    disabled={updateMutation.isPending}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-[14px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50',
                                        tx.status === 'DRAFT'
                                            ? 'border border-border-soft text-muted-foreground hover:bg-[var(--surface-sunken)]'
                                            : 'text-white'
                                    )}
                                    style={tx.status === 'DRAFT' ? undefined : { background: 'var(--banner-gradient)' }}
                                >
                                    {tx.status !== 'DRAFT' && <Check size={14} strokeWidth={2.5} />}
                                    {updateMutation.isPending
                                        ? '…'
                                        : tx.status === 'DRAFT'
                                          ? t('transactions.detail.saveDraft')
                                          : t('transactions.detail.save')}
                                </button>
                                {tx.status === 'DRAFT' && (
                                    <HintTooltip content={confirmBlockers}>
                                        <button
                                            onClick={handleSaveAndConfirm}
                                            disabled={updateMutation.isPending || confirmMutation.isPending || !canConfirm}
                                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ background: 'var(--banner-gradient)' }}
                                        >
                                            <Check size={14} strokeWidth={2.5} />
                                            {confirmMutation.isPending ? '…' : t('transactions.detail.confirm')}
                                        </button>
                                    </HintTooltip>
                                )}
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setConfirmDeleteOpen(true)}
                                    disabled={deleteMutation.isPending}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-bold text-[var(--negative)] hover:bg-[var(--negative-surface)] transition-colors"
                                >
                                    <Trash2 size={14} />
                                    {t('transactions.detail.delete')}
                                </button>
                                <div className="flex-1" />
                                <button
                                    onClick={startEdit}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-bold border border-border-soft text-foreground hover:bg-[var(--surface-sunken)] transition-colors"
                                >
                                    <Pencil size={14} />
                                    {t('transactions.detail.edit')}
                                </button>
                                {tx.status === 'DRAFT' ? (
                                    <HintTooltip content={confirmBlockers}>
                                        <button
                                            onClick={handleConfirm}
                                            disabled={confirmMutation.isPending || !canConfirm}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ background: 'var(--banner-gradient)' }}
                                        >
                                            <Check size={14} strokeWidth={2.5} />
                                            {confirmMutation.isPending ? '…' : t('transactions.detail.confirm')}
                                        </button>
                                    </HintTooltip>
                                ) : (
                                    <button
                                        onClick={handleReopen}
                                        disabled={reopenMutation.isPending}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-bold border border-border-soft text-[var(--warning)] hover:bg-[var(--warning-surface)] hover:border-[var(--warning-border)] transition-colors disabled:opacity-50"
                                    >
                                        <RotateCcw size={14} />
                                        {reopenMutation.isPending ? '…' : t('transactions.detail.reopen')}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            <DeleteTransactionDialog
                open={confirmDeleteOpen}
                transactionName={tx?.name || tx?.senderName || ''}
                transactionAmount={fmtCurrency(tx?.total)}
                hasReceipt={tx?.documentId != null}
                onDeleteTransactionOnly={() => handleDelete(false)}
                onDeleteWithReceipt={() => handleDelete(true)}
                onCancel={() => setConfirmDeleteOpen(false)}
            />
        </>
    );
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function TransactionRow({
    tx,
    onClick,
    selected,
    bulkSelected,
    onToggleBulk,
}: {
    tx: TransactionResponse;
    onClick: () => void;
    selected: boolean;
    bulkSelected: boolean;
    onToggleBulk: () => void;
}) {
    const { t } = useTranslation();
    const hideBommel = useMediaQuery(HIDE_BOMMEL_QUERY);
    const categoryText = (tx.categoryValues ?? [])
        .map((c) => c.value)
        .filter(Boolean)
        .join(', ');
    const amount = tx.total ? Number(tx.total) : 0;
    const incoming = amount >= 0;
    const highlighted = selected || bulkSelected;

    return (
        <button
            onClick={onClick}
            className={cn('w-full grid items-center text-left border-b border-border-soft last:border-b-0 transition-colors')}
            style={{
                gridTemplateColumns: hideBommel ? TX_GRID_NARROW : TX_GRID,
                padding: '14px 20px',
                background: highlighted ? 'var(--accent-surface)' : undefined,
                fontFamily: FONT,
            }}
            onMouseEnter={(e) => {
                if (!highlighted) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-sunken)';
            }}
            onMouseLeave={(e) => {
                if (!highlighted) (e.currentTarget as HTMLButtonElement).style.background = '';
            }}
        >
            {/* Bulk-select checkbox — stops propagation so ticking a row doesn't open the drawer */}
            <span
                role="checkbox"
                aria-checked={bulkSelected}
                aria-label={t('transactions.bulk.selectRow')}
                tabIndex={0}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleBulk();
                }}
                onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleBulk();
                    }
                }}
                className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-colors',
                    bulkSelected ? 'bg-primary border-primary' : 'border-[var(--border-strong)] hover:border-primary'
                )}
            >
                {bulkSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </span>

            {/* Transaktion */}
            <span className="flex items-center gap-3 min-w-0 pr-4">
                <TxIcon size={36} incoming={incoming} />
                <span className="flex flex-col min-w-0">
                    <span className="font-bold text-[14px] text-foreground truncate leading-snug flex items-center gap-1.5">
                        {tx.name ?? '—'}
                        {tx.documentId && <FileText size={13} className="text-purple-700 flex-shrink-0" />}
                    </span>
                    <span className="text-[12px] text-muted-foreground truncate leading-snug">{tx.senderName ?? ''}</span>
                </span>
            </span>

            {/* Bommel. `truncate` only bites on a block box, and the grid item needs min-w-0 before it can
                shrink at all — without both the long names overflowed and pushed the later columns out of line. */}
            {!hideBommel && (
                <span className="min-w-0 pr-3">
                    {tx.bommelName ? (
                        <span className="block truncate text-[13.5px] text-muted-foreground" title={tx.bommelName}>
                            {tx.bommelName}
                        </span>
                    ) : (
                        <Badge variant="warn">{t('transactions.unassigned')}</Badge>
                    )}
                </span>
            )}

            {/* Category group values, joined. A transaction can carry one per group, and the column is far too
                narrow to list them, so the full set goes in the title. */}
            <span className="min-w-0 pr-3">
                {categoryText && (
                    <span className="block truncate text-[13.5px] text-muted-foreground" title={categoryText}>
                        {categoryText}
                    </span>
                )}
            </span>

            {/* Date */}
            <span className="text-[13.5px] text-muted-foreground whitespace-nowrap tabular-nums">{fmtDate(tx.transactionTime)}</span>

            {/* Created at */}
            <span className="text-[13px] text-[var(--ink-faint)] whitespace-nowrap tabular-nums">{fmtDate(tx.createdAt)}</span>

            {/* Status, plus whether a bank movement backs this transaction. `coveredAmount` is the signed net
                of the linked movements, so a non-zero value means at least one is attached. */}
            <span className="flex flex-col items-start gap-1">
                <StatusBadge status={tx.status} />
                {Math.abs(tx.coveredAmount != null ? Number(tx.coveredAmount) : 0) > 0.005 ? (
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--positive)]">
                        <Link2 size={12} strokeWidth={2.5} />
                        {t('transactions.linked')}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--warning)]">
                        <Unlink size={12} strokeWidth={2.5} />
                        {t('transactions.notLinked')}
                    </span>
                )}
            </span>

            {/* Amount — plus the reconciliation delta vs. linked bank movements, shown under the amount like the
                bank-transaction table. The open delta is SIGNED (remaining = total − covered): a positive value (green)
                still needs income, a negative value (red) still needs expense — so a positive and a negative shortfall
                never look alike. Hidden once it matches (delta ≈ 0), regardless of confirm status. */}
            <span className="flex flex-col items-end leading-tight">
                <span className="font-bold tabular-nums whitespace-nowrap" style={{ fontSize: 14.5, color: incoming ? 'var(--positive)' : 'var(--negative)' }}>
                    {incoming ? '+' : '–'} {fmtCurrency(Math.abs(amount))}
                </span>
                {(() => {
                    // coveredAmount is the SIGNED net of linked bank movements (same as the detail's "Zugeordnet").
                    const total = tx.total != null ? Number(tx.total) : 0;
                    const covered = tx.coveredAmount != null ? Number(tx.coveredAmount) : 0;
                    if (Math.abs(total) < 0.005) return null;
                    const remaining = total - covered; // signed
                    const open = Math.abs(remaining);
                    if (open > 0.005) {
                        const positive = remaining > 0;
                        const over = Math.abs(covered) > Math.abs(total) + 0.005;
                        const label = over ? 'transactions.overCovered' : 'transactions.openToCover';
                        return (
                            <span
                                className="text-[11px] font-semibold tabular-nums whitespace-nowrap"
                                style={{ color: positive ? 'var(--positive)' : 'var(--negative)' }}
                            >
                                {t(label, { amount: `${positive ? '+' : '–'} ${fmtCurrency(open)}` })}
                            </span>
                        );
                    }
                    // Fully covered: surface a positive status on drafts (still being reconciled); confirmed rows are
                    // done, so they stay clean.
                    if (tx.status === 'DRAFT') {
                        return <span className="text-[11px] font-semibold text-[var(--positive)] whitespace-nowrap">{t('transactions.fullyCovered')}</span>;
                    }
                    return null;
                })()}
            </span>
        </button>
    );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function TransactionenView() {
    const { t } = useTranslation();
    usePageTitle(t('transactions.title'));
    const hideBommel = useMediaQuery(HIDE_BOMMEL_QUERY);

    const [search, setSearch] = usePersistedState<string>('hopps.transactions.search', '');
    const [statusFilter, setStatusFilter] = usePersistedState<'ALL' | 'CONFIRMED' | 'DRAFT'>('hopps.transactions.statusFilter', 'ALL');
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [bommelIds, setBommelIds] = usePersistedState<number[]>('hopps.transactions.bommelIds', []);
    const [startDate, setStartDate] = usePersistedState<string>('hopps.transactions.startDate', '');
    const [endDate, setEndDate] = usePersistedState<string>('hopps.transactions.endDate', '');
    const [privatelyPaid, setPrivatelyPaid] = usePersistedState<boolean>('hopps.transactions.privatelyPaid', false);
    const [detached, setDetached] = usePersistedState<boolean>('hopps.transactions.detached', false);
    // Category-group filters: which groups the user chose to surface as filters, and the value picked per group.
    // New storage key: the shape changed from `(number | null)[]` plus a one-value-per-group record to a
    // row list, and old entries cannot be read as either.
    const [categoryFilterRows, setCategoryFilterRows] = usePersistedState<CategoryFilterRow[]>('hopps.transactions.categoryFilterRows', []);
    const { data: categoryFilterGroups = [] } = useCategoryGroups();
    const [sortBy, setSortBy] = usePersistedState<TransactionSortBy>('hopps.transactions.sortBy', 'createdAt');
    const [sortDir, setSortDir] = usePersistedState<SortDirection>('hopps.transactions.sortDir', 'desc');
    const [page, setPage] = useState(0);
    const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const bulkDelete = useDeleteTransaction();
    const deleteDocumentBulk = useDeleteDocument();
    const PAGE_SIZE = 30;

    // Open a specific transaction when navigated to with ?id= (e.g. from a linked receipt)
    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
        const idParam = searchParams.get('id');
        if (idParam) setSelectedTxId(Number(idParam));
    }, [searchParams]);

    // Pre-filter by a bommel when navigated to with ?bommelId= (e.g. from the org structure "Zu Transaktionen" button).
    // The param is consumed once and cleared from the URL so it doesn't override the user's later filter changes.
    useEffect(() => {
        const bommelParam = searchParams.get('bommelId');
        if (bommelParam) {
            setBommelIds([Number(bommelParam)]);
            setPage(0);
            setAdvancedOpen(true);
            searchParams.delete('bommelId');
            setSearchParams(searchParams, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const closeDrawer = () => {
        setSelectedTxId(null);
        if (searchParams.has('id')) {
            searchParams.delete('id');
            setSearchParams(searchParams, { replace: true });
        }
    };

    // Toggle sorting from a table column header: same column flips direction, new column starts descending.
    const handleSort = (field: TransactionSortBy) => {
        if (sortBy === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(field);
            setSortDir('desc');
        }
        setPage(0);
    };

    // Collapse the rows into the wire shape: the values of a group gathered under its id.
    const categoryFilters = useMemo(() => {
        const byGroup: Record<number, string[]> = {};
        categoryFilterRows.forEach((row) => {
            if (row.groupId == null || !row.value) return;
            const list = byGroup[row.groupId] ?? (byGroup[row.groupId] = []);
            if (!list.includes(row.value)) list.push(row.value);
        });
        return byGroup;
    }, [categoryFilterRows]);

    const filters: TransactionFilters = {
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as TransactionStatus),
        bommelIds: bommelIds.length > 0 ? bommelIds : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        privatelyPaid: privatelyPaid || undefined,
        detached: detached || undefined,
        categoryValues: categoryFilters,
        sortBy,
        sortDir,
        page,
        size: PAGE_SIZE,
    };

    const { data: txData, isLoading } = useTransactions(filters);
    // Count and income/expense sums across all pages (a single page cannot provide them). Refetches on filter change,
    // not on paging.
    const { data: aggregate } = useTransactionAggregate(filters);
    // Tab counts: the same filters as the list minus the status tab itself, so each tab reports how many
    // rows it would show under the filters that are actually active.
    const countFilters: TransactionFilters = {
        search: filters.search,
        bommelIds: filters.bommelIds,
        startDate: filters.startDate,
        endDate: filters.endDate,
        privatelyPaid: filters.privatelyPaid,
        detached: filters.detached,
        categoryValues: filters.categoryValues,
    };
    const { data: countAll } = useTransactionAggregate(countFilters);
    const { data: countConfirmed } = useTransactionAggregate({ ...countFilters, status: 'CONFIRMED' });
    const { data: countDraft } = useTransactionAggregate({ ...countFilters, status: 'DRAFT' });
    const statusCounts: Record<'ALL' | 'CONFIRMED' | 'DRAFT', number> = {
        ALL: countAll?.count ?? 0,
        CONFIRMED: countConfirmed?.count ?? 0,
        DRAFT: countDraft?.count ?? 0,
    };
    const allBommels = useBommelsStore((s) => s.allBommels);
    const rootBommel = useBommelsStore((s) => s.rootBommel);
    const loadBommelsForFilter = useBommelsStore((s) => s.loadBommels);
    const bommelsLoading = useBommelsStore((s) => s.isLoading);
    const { organization } = useStore();

    useEffect(() => {
        if (organization?.id && allBommels.length === 0) {
            loadBommelsForFilter(organization.id);
        }
    }, [organization?.id, allBommels.length, loadBommelsForFilter]);

    const bommelItems = useMemo(() => flattenBommelTree(allBommels, rootBommel?.id), [allBommels, rootBommel?.id]);

    // The picker chooses one bommel; the filter still sends a list, because selecting a parent has to
    // include everything under it and the org service matches bommel ids exactly.
    const bommelSelection: BommelSelection = bommelIds.length > 0 ? (bommelIds[0] as number) : ALL_BOMMELS;
    const onBommelSelectionChange = (next: BommelSelection) => {
        setBommelIds(next === ALL_BOMMELS ? [] : collectSubtreeIds(allBommels, next));
        setPage(0);
    };

    const transactions: TransactionResponse[] = useMemo(() => {
        if (!txData) return [];
        if (Array.isArray(txData)) return txData as TransactionResponse[];
        const r = txData as unknown as { content?: TransactionResponse[]; data?: TransactionResponse[] };
        return r.content ?? r.data ?? [];
    }, [txData]);

    // Real totals come from the aggregate endpoint (whole filtered set); while it loads, fall back to the current page.
    const totalCount = aggregate?.count ?? transactions.length;
    const totalIncome = Number(aggregate?.sumIncome ?? 0);
    const totalExpense = Number(aggregate?.sumExpense ?? 0);

    // ── Bulk selection (for multi-delete) ──
    const pageIds = transactions.map((tx) => tx.id).filter((id): id is number => id != null);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    const somePageSelected = pageIds.some((id) => selectedIds.has(id));

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Header checkbox toggles the whole current page (selections on other pages are kept).
    const toggleSelectAll = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allPageSelected) pageIds.forEach((id) => next.delete(id));
            else pageIds.forEach((id) => next.add(id));
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    // documentId per selected row, for the "with receipts" branch. Only the loaded page is known here; a selection
    // carried over from another page falls back to a transaction-only delete, so no receipt is removed unseen.
    const selectedDocumentIds = useMemo(() => {
        const byId = new Map<number, number | null>();
        (txData ?? []).forEach((tx) => {
            if (tx.id != null && selectedIds.has(tx.id)) byId.set(tx.id, tx.documentId ?? null);
        });
        return byId;
    }, [txData, selectedIds]);

    const selectionHasReceipts = Array.from(selectedDocumentIds.values()).some((docId) => docId != null);

    const handleBulkDelete = async (withReceipts: boolean) => {
        const ids = Array.from(selectedIds);
        // allSettled so one failed delete doesn't abort the rest; the list refetches via query invalidation.
        await Promise.allSettled(
            ids.map((id) => {
                const documentId = withReceipts ? selectedDocumentIds.get(id) : null;
                // Deleting the document removes its transaction too, so rows with a receipt need only that one call.
                return documentId != null ? deleteDocumentBulk.mutateAsync(documentId) : bulkDelete.mutateAsync(id);
            })
        );
        if (selectedTxId != null && selectedIds.has(selectedTxId)) setSelectedTxId(null);
        clearSelection();
        setBulkDeleteOpen(false);
    };

    // ── Category-group filter handlers ──
    const addCategoryFilterRow = () => {
        setCategoryFilterRows((prev) => [...prev, { groupId: null }]);
    };
    const removeCategoryFilterRow = (index: number) => {
        const had = categoryFilterRows[index]?.value;
        setCategoryFilterRows((prev) => prev.filter((_, i) => i !== index));
        if (had) setPage(0);
    };
    // Swapping a row's group drops its value, which belonged to the old group.
    const changeCategoryFilterGroup = (index: number, groupId: number | null) => {
        const had = categoryFilterRows[index]?.value;
        setCategoryFilterRows((prev) => prev.map((row, i) => (i === index ? { groupId } : row)));
        if (had) setPage(0);
    };
    const setCategoryFilterRowValue = (index: number, value: string | undefined) => {
        setCategoryFilterRows((prev) => prev.map((row, i) => (i === index ? { ...row, value } : row)));
        setPage(0);
    };

    const activeFilters: { key: string; label: string; clear: () => void }[] = [];
    if (search) activeFilters.push({ key: 'search', label: `"${search}"`, clear: () => setSearch('') });
    if (bommelIds.length > 0) {
        const chosen = allBommels.find((b) => b.id === bommelIds[0]);
        activeFilters.push({
            key: `bommel-${bommelIds[0]}`,
            label: (chosen as { name?: string } | undefined)?.name ?? String(bommelIds[0]),
            clear: () => {
                setBommelIds([]);
                setPage(0);
            },
        });
    }
    if (startDate) activeFilters.push({ key: 'from', label: `${t('transactions.filters.from')}: ${startDate}`, clear: () => setStartDate('') });
    if (endDate) activeFilters.push({ key: 'to', label: `${t('transactions.filters.to')}: ${endDate}`, clear: () => setEndDate('') });
    if (privatelyPaid) activeFilters.push({ key: 'priv', label: t('transactions.filters.privatelyPaid'), clear: () => setPrivatelyPaid(false) });
    if (detached) activeFilters.push({ key: 'det', label: t('transactions.filters.detached'), clear: () => setDetached(false) });
    // One chip per category group that actually has a value set (a shown-but-empty group is not an active filter).
    Object.entries(categoryFilters).forEach(([gid, vals]) => {
        const group = categoryFilterGroups.find((g) => g.id === Number(gid));
        activeFilters.push({
            key: `cat-${gid}`,
            label: `${group?.name ?? gid}: ${vals.join(', ')}`,
            clear: () => {
                setCategoryFilterRows((prev) => prev.filter((row) => row.groupId !== Number(gid)));
                setPage(0);
            },
        });
    });

    function resetAll() {
        setSearch('');
        setStatusFilter('ALL');
        setBommelIds([]);
        setStartDate('');
        setEndDate('');
        setPrivatelyPaid(false);
        setDetached(false);
        setCategoryFilterRows([]);
        setPage(0);
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    // The status tabs are not a filter for this purpose: switching to Bestätigt or Entwürfe alone does not offer a reset.
    const hasFilters = activeFilters.length > 0;
    // Badge on the Filter button: how many of the panel's own filters are set. The search box sits outside the
    // panel, so it is deliberately left out.
    const advancedFilterCount =
        (bommelIds.length > 0 ? 1 : 0) +
        (startDate ? 1 : 0) +
        (endDate ? 1 : 0) +
        (privatelyPaid ? 1 : 0) +
        (detached ? 1 : 0) +
        Object.keys(categoryFilters).length;

    // Input/select base style
    const inputCls =
        'h-10 w-full rounded-xl border border-border-soft bg-[var(--background-secondary)] px-3.5 text-[14px] text-foreground transition-shadow focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-surface)]';

    return (
        <div className="flex flex-col h-full min-h-0" style={{ fontFamily: FONT }}>
            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                    <h1 className="font-bold text-foreground leading-tight" style={{ fontSize: 26 }}>
                        {t('transactions.title')}
                    </h1>
                    <p className="mt-1 text-[13.5px] text-muted-foreground">
                        {t('transactions.subtitle', {
                            count: totalCount,
                            income: fmtCurrency(totalIncome),
                            expense: fmtCurrency(totalExpense),
                        })}
                    </p>
                </div>
                <button
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex items-center gap-2 whitespace-nowrap text-white font-bold transition-opacity hover:opacity-90"
                    style={{
                        background: 'var(--banner-gradient)',
                        fontSize: 14.5,
                        padding: '11px 20px',
                        borderRadius: 999,
                        boxShadow: '0 1px 2px rgba(20,20,40,.05), 0 6px 22px rgba(120,60,200,.18)',
                    }}
                >
                    <Plus size={16} strokeWidth={2.5} />
                    {t('transactions.new')}
                </button>
            </div>

            {/* ── Filter bar ── */}
            <div className="mb-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                            placeholder={t('transactions.filters.search')}
                            className="w-full rounded-xl border border-border-soft bg-[var(--background-secondary)] py-[11px] pl-[38px] pr-3.5 text-[14.5px] text-foreground transition-shadow placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-surface)]"
                        />
                    </div>

                    {/* Status segmented toggle */}
                    <div className="inline-flex gap-0.5 p-1" style={{ background: 'var(--surface-track)', borderRadius: 12 }}>
                        {(['ALL', 'CONFIRMED', 'DRAFT'] as const).map((s) => {
                            const active = statusFilter === s;
                            const label = s === 'DRAFT' ? t('transactions.status.drafts') : t(`transactions.status.${s.toLowerCase()}`);
                            return (
                                <button
                                    key={s}
                                    onClick={() => {
                                        setStatusFilter(s);
                                        setPage(0);
                                    }}
                                    className="inline-flex items-center gap-[7px] px-4 py-2 font-bold transition-colors"
                                    style={{
                                        fontSize: 13.5,
                                        borderRadius: 9,
                                        color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                                        background: active ? 'var(--background-secondary)' : 'transparent',
                                        boxShadow: active ? '0 1px 2px rgba(24,16,40,.08)' : 'none',
                                    }}
                                >
                                    {label}
                                    <span
                                        className="grid place-items-center rounded-full px-[5px] font-extrabold"
                                        style={{
                                            minWidth: 20,
                                            height: 20,
                                            fontSize: 11.5,
                                            background: active ? 'var(--primary)' : 'var(--accent-surface)',
                                            color: active ? '#FFFFFF' : 'var(--purple-700)',
                                        }}
                                    >
                                        {statusCounts[s]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Advanced filter toggle */}
                    <button
                        onClick={() => setAdvancedOpen((v) => !v)}
                        aria-expanded={advancedOpen}
                        className="inline-flex items-center gap-[7px] whitespace-nowrap font-semibold transition-colors"
                        style={{
                            fontSize: 13.5,
                            padding: '8px 14px',
                            borderRadius: 9,
                            border: '1px solid',
                            borderColor: advancedOpen ? 'transparent' : 'var(--border-soft)',
                            background: advancedOpen ? 'var(--purple-100)' : 'var(--background-secondary)',
                            color: advancedOpen ? 'var(--purple-700)' : 'var(--muted-foreground)',
                        }}
                    >
                        <Filter size={15} />
                        {t('transactions.filters.filter')}
                        {advancedFilterCount > 0 && (
                            <span
                                className="grid place-items-center rounded-full px-[5px] font-extrabold"
                                style={{
                                    minWidth: 20,
                                    height: 20,
                                    fontSize: 11.5,
                                    background: advancedOpen ? 'var(--primary)' : 'var(--accent-surface)',
                                    color: advancedOpen ? '#FFFFFF' : 'var(--purple-700)',
                                }}
                            >
                                {advancedFilterCount}
                            </span>
                        )}
                    </button>

                    {hasFilters && (
                        <button
                            onClick={resetAll}
                            className="text-[13px] font-semibold text-[var(--ink-faint)] hover:text-foreground transition-colors underline-offset-2 hover:underline"
                        >
                            {t('transactions.filters.reset')}
                        </button>
                    )}
                </div>

                {/* Advanced filter panel */}
                {advancedOpen && (
                    <div
                        className="grid grid-cols-2 gap-3 rounded-[18px] border border-border-soft p-4 sm:grid-cols-3 md:grid-cols-4"
                        style={{ background: 'var(--background-secondary)', boxShadow: '0 1px 2px rgba(20,20,40,.05), 0 6px 22px rgba(20,20,40,.05)' }}
                    >
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[11px] font-bold text-[var(--ink-faint)] uppercase tracking-[0.06em]">
                                {t('transactions.filters.bommel')}
                            </label>
                            <BommelSelect
                                items={bommelItems}
                                value={bommelSelection}
                                onChange={onBommelSelectionChange}
                                isLoading={bommelsLoading}
                                triggerClassName="sm:w-full rounded-xl border-border-soft shadow-none hover:shadow-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-[var(--ink-faint)] uppercase tracking-[0.06em]">
                                {t('transactions.filters.from')}
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setPage(0);
                                }}
                                className={inputCls}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-[var(--ink-faint)] uppercase tracking-[0.06em]">{t('transactions.filters.to')}</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setPage(0);
                                }}
                                className={inputCls}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[11px] font-bold text-[var(--ink-faint)] uppercase tracking-[0.06em]">Eigenschaften</label>
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    {
                                        key: 'priv',
                                        icon: Wallet,
                                        label: t('transactions.filters.privatelyPaid'),
                                        active: privatelyPaid,
                                        toggle: () => {
                                            setPrivatelyPaid((v) => !v);
                                            setPage(0);
                                        },
                                    },
                                    {
                                        key: 'det',
                                        icon: Unlink,
                                        label: t('transactions.filters.detached'),
                                        active: detached,
                                        toggle: () => {
                                            setDetached((v) => !v);
                                            setPage(0);
                                        },
                                    },
                                ].map(({ key, icon: Icon, label, active, toggle }) => (
                                    <button
                                        key={key}
                                        onClick={toggle}
                                        className="inline-flex h-10 items-center gap-1.5 font-semibold transition-colors"
                                        style={{
                                            fontSize: 13.5,
                                            padding: '0 14px',
                                            borderRadius: 12,
                                            border: '1px solid',
                                            borderColor: active ? 'var(--primary)' : 'var(--border-soft)',
                                            background: active ? 'var(--accent-surface)' : 'var(--background-secondary)',
                                            color: active ? 'var(--purple-700)' : 'var(--muted-foreground)',
                                        }}
                                    >
                                        <Icon size={14} strokeWidth={2} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Category-group filters — the user chooses which groups to filter by; each gets a value picker. */}
                        {categoryFilterGroups.length > 0 && (
                            <TransactionCategoryFilter
                                groups={categoryFilterGroups}
                                rows={categoryFilterRows}
                                onAddRow={addCategoryFilterRow}
                                onRemoveRow={removeCategoryFilterRow}
                                onChangeGroup={changeCategoryFilterGroup}
                                onChangeValue={setCategoryFilterRowValue}
                            />
                        )}
                    </div>
                )}

                {/* Active filter chips. They summarise what is set while the panel is closed; with it open every
                    one of them is already on screen as its own control, so the strip would just repeat it. */}
                {!advancedOpen && activeFilters.length > 0 && (
                    <div className="-mt-1 flex flex-wrap items-center gap-2">
                        {activeFilters.map((f) => (
                            <FilterChip key={f.key} label={f.label} onRemove={f.clear} />
                        ))}
                    </div>
                )}

                {/* Bulk selection toolbar */}
                {selectedIds.size > 0 && (
                    <div
                        className="flex items-center gap-3 rounded-[14px] border px-4 py-2.5 mt-1"
                        style={{ background: 'var(--accent-surface)', borderColor: 'var(--purple-200)' }}
                    >
                        <span className="text-[13.5px] font-bold text-foreground">{t('transactions.bulk.selectedCount', { n: selectedIds.size })}</span>
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {t('transactions.bulk.clear')}
                        </button>
                        <div className="flex-1" />
                        <button
                            type="button"
                            onClick={() => setBulkDeleteOpen(true)}
                            disabled={bulkDelete.isPending}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            style={{ background: 'var(--negative-solid)' }}
                        >
                            <Trash2 size={14} />
                            {t('transactions.bulk.delete')}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Table ── */}
            <div className="flex-1 min-h-0 overflow-auto">
                {isLoading ? (
                    <TableSkeleton hideBommel={hideBommel} />
                ) : transactions.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center py-20 text-center rounded-[18px] border border-border-soft"
                        style={{ background: 'var(--background-secondary)', boxShadow: '0 1px 2px rgba(20,20,40,.05)' }}
                    >
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--accent-surface)' }}>
                            <FileText size={26} className="text-primary" />
                        </div>
                        <p className="font-bold text-foreground" style={{ fontSize: 16 }}>
                            {t('transactions.noResults')}
                        </p>
                        <p className="mt-1 text-[13.5px] text-muted-foreground">{t('transactions.noResultsDesc')}</p>
                    </div>
                ) : (
                    <div
                        className="rounded-[18px] border border-border-soft overflow-hidden"
                        style={{ background: 'var(--background-secondary)', boxShadow: '0 1px 2px rgba(20,20,40,.05), 0 6px 22px rgba(20,20,40,.05)' }}
                    >
                        {/* Table header */}
                        <div
                            className="grid items-center border-b border-border-soft"
                            style={{
                                gridTemplateColumns: hideBommel ? TX_GRID_NARROW : TX_GRID,
                                padding: '11px 20px',
                                fontFamily: FONT,
                            }}
                        >
                            {/* Select-all checkbox (current page) */}
                            <span
                                role="checkbox"
                                aria-checked={allPageSelected ? 'true' : somePageSelected ? 'mixed' : 'false'}
                                aria-label={t('transactions.bulk.selectAll')}
                                tabIndex={0}
                                onClick={toggleSelectAll}
                                onKeyDown={(e) => {
                                    if (e.key === ' ' || e.key === 'Enter') {
                                        e.preventDefault();
                                        toggleSelectAll();
                                    }
                                }}
                                className={cn(
                                    'w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-colors',
                                    allPageSelected || somePageSelected ? 'bg-primary border-primary' : 'border-[var(--border-strong)] hover:border-primary'
                                )}
                            >
                                {allPageSelected ? (
                                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                ) : somePageSelected ? (
                                    <Minus className="w-3 h-3 text-white" strokeWidth={3} />
                                ) : null}
                            </span>
                            {[
                                t('transactions.columns.transaction'),
                                ...(hideBommel ? [] : [t('transactions.columns.bommel')]),
                                t('transactions.columns.category'),
                            ].map((col) => (
                                <span
                                    key={col}
                                    style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.07em' }}
                                >
                                    {col}
                                </span>
                            ))}
                            <SortHeader
                                label={t('transactions.columns.date')}
                                active={sortBy === 'transactionTime'}
                                direction={sortDir}
                                onClick={() => handleSort('transactionTime')}
                            />
                            <SortHeader
                                label={t('transactions.columns.createdAt')}
                                active={sortBy === 'createdAt'}
                                direction={sortDir}
                                onClick={() => handleSort('createdAt')}
                            />
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                {t('transactions.columns.status')}
                            </span>
                            <SortHeader
                                label={t('transactions.columns.amount')}
                                active={sortBy === 'total'}
                                direction={sortDir}
                                onClick={() => handleSort('total')}
                                align="right"
                            />
                        </div>

                        {transactions.map((tx) => (
                            <TransactionRow
                                key={tx.id}
                                tx={tx}
                                onClick={() => setSelectedTxId(tx.id ?? null)}
                                selected={selectedTxId === tx.id}
                                bulkSelected={tx.id != null && selectedIds.has(tx.id)}
                                onToggleBulk={() => tx.id != null && toggleSelect(tx.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4 text-sm">
                    <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-border-soft text-muted-foreground hover:text-foreground hover:border-purple-300 disabled:opacity-35 disabled:pointer-events-none transition-colors"
                        style={{ background: 'var(--background-secondary)' }}
                    >
                        <ChevronLeft size={17} />
                    </button>
                    <span className="text-[13.5px] font-semibold text-muted-foreground">
                        {page + 1} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-border-soft text-muted-foreground hover:text-foreground hover:border-purple-300 disabled:opacity-35 disabled:pointer-events-none transition-colors"
                        style={{ background: 'var(--background-secondary)' }}
                    >
                        <ChevronRight size={17} />
                    </button>
                </div>
            )}

            {/* Detail drawer */}
            <TransactionDrawer txId={selectedTxId} onClose={closeDrawer} onDeleted={closeDrawer} />

            {/* Create transaction drawer */}
            <CreateTransactionDrawer open={createOpen} onClose={() => setCreateOpen(false)} />

            <DeleteTransactionDialog
                open={bulkDeleteOpen}
                transactionName=""
                transactionAmount=""
                description={t('transactions.bulk.confirmDesc', { n: selectedIds.size })}
                hasReceipt={selectionHasReceipts}
                onDeleteTransactionOnly={() => handleBulkDelete(false)}
                onDeleteWithReceipt={() => handleBulkDelete(true)}
                onCancel={() => setBulkDeleteOpen(false)}
            />
        </div>
    );
}
