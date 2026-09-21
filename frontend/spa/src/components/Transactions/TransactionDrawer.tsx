import { TransactionUpdateRequest } from '@hopps/api-client';
import { ArrowDownRight, ArrowUpRight, Check, ExternalLink, FileText, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import CategoryGroupFields from '@/components/CategoryGroups/CategoryGroupFields';
import { buildBommelIndex, missingRequiredGroups } from '@/components/CategoryGroups/helpers';
import { ALL_BOMMELS, BommelSelect } from '@/components/Dashboard/BommelSelect';
import { flattenBommelTree } from '@/components/Dashboard/bommelTree';
import { getLastBommelId } from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector';
import { DeleteTransactionDialog } from '@/components/Receipts/DeleteTransactionDialog';
import { DocumentFilePreview } from '@/components/Receipts/DocumentFilePreview';
import { BankMatchSection } from '@/components/Transactions/BankMatchSection';
import { Eyebrow } from '@/components/Transactions/Eyebrow';
import { fmtCurrency, fmtDate } from '@/components/Transactions/format';
import { FONT } from '@/components/Transactions/layout';
import { StatusBadge } from '@/components/Transactions/StatusBadge';
import { TagInput } from '@/components/Transactions/TagInput';
import { DrawerSkeleton } from '@/components/Transactions/TransactionsSkeleton';
import { TxIcon } from '@/components/Transactions/TxIcon';
import { CloseButton } from '@/components/ui/CloseButton';
import Emoji from '@/components/ui/Emoji';
import { HintTooltip } from '@/components/ui/HintTooltip';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import TextField from '@/components/ui/TextField';
import { useBankTransactionsForTransaction } from '@/hooks/queries/useBankAccounts';
import { useCategoryGroups } from '@/hooks/queries/useCategoryGroups';
import { useDeleteDocument, useDocument } from '@/hooks/queries/useDocuments';
import { useTransaction, useDeleteTransaction, useUpdateTransaction, useConfirmTransaction, useReopenTransaction } from '@/hooks/queries/useTransactions';
import { useToast } from '@/hooks/use-toast';
import { getTransactionConfirmState } from '@/lib/transactionConfirm';
import { cn } from '@/lib/utils';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

// Field label above an input: small, heavy, uppercase.
const labelCls = 'text-[12px] font-extrabold uppercase tracking-[0.04em] text-[var(--ink-faint)]';
const inputCls =
    'h-10 w-full rounded-xl border border-border-soft bg-[var(--background-secondary)] px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground transition-shadow focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-surface)]';

// Footer buttons. Height and type size follow the design system's default button.
const footerBtn = 'h-[42px] gap-2 rounded-[var(--btn-radius)] px-5 text-[14.5px] font-bold';
const outlineBtn = 'border border-border-soft text-foreground hover:bg-[var(--background-secondary)]';

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-[7px]">
            <span className={labelCls}>{label}</span>
            {children}
        </div>
    );
}

// Direction options of the edit form: an expense leaves the account (up), an income arrives (down).
const DIRECTIONS = [
    { id: 'expense', Icon: ArrowUpRight, ink: 'var(--negative)', tint: 'var(--negative-surface)' },
    { id: 'income', Icon: ArrowDownRight, ink: 'var(--positive)', tint: 'var(--positive-surface)' },
] as const;

/**
 * Detail drawer of a transaction: read view with the reconciliation of linked bank movements, and an edit form.
 * A transaction stays editable and deletable in every status.
 */
export function TransactionDrawer({ txId, onClose, onDeleted }: { txId: number | null; onClose: () => void; onDeleted: () => void }) {
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
    const [tags, setTags] = useState<string[]>([]);
    const [categoryValues, setCategoryValues] = useState<Record<number, string>>({});
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const { data: categoryGroups = [] } = useCategoryGroups();
    const { showError } = useToast();

    // A transaction always opens in the read view; the edit form only appears after "Bearbeiten". Reset it whenever a
    // different transaction is opened.
    useEffect(() => {
        setEditMode(false);
        setConfirmDeleteOpen(false);
    }, [txId]);

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
        setTags(tx.tags ?? []);
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
            // Always sent, so removing the last tag clears them (an omitted list leaves them as they are).
            tags,
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
        // Back to the list after confirming, rather than staying in the detail view.
        onClose();
    }

    async function handleReopen() {
        if (!tx?.id) return;
        await reopenMutation.mutateAsync(tx.id);
    }

    const amount = tx?.total ? Number(tx.total) : 0;
    const incoming = amount >= 0;

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

    // Master data rows of the read view. Bommel stays empty when the transaction has none.
    const bommelEmoji = tx?.bommelId != null ? allBommels.find((b) => b.id === tx.bommelId)?.emoji : undefined;
    const detailRows: [string, ReactNode][] = tx
        ? [
              [
                  t('transactions.detail.bommel'),
                  <span key="bommel" className="inline-flex items-center gap-2">
                      {bommelEmoji && <Emoji emoji={bommelEmoji} className="text-base" />}
                      {tx.bommelName ?? ''}
                  </span>,
              ],
              [t('transactions.detail.date'), fmtDate(tx.transactionTime)],
              [t('transactions.detail.privatelyPaid'), tx.privatelyPaid ? t('transactions.detail.yes') : t('transactions.detail.no')],
              ...(tx.categoryValues ?? [])
                  .filter((c) => c.value)
                  .map((c): [string, ReactNode] => [
                      categoryGroups.find((g) => g.id === c.groupId)?.name ?? t('categoryGroups.fields.eyebrow'),
                      c.value ?? '—',
                  ]),
              ...(tx.tags?.length
                  ? [
                        [
                            t('transactions.create.tags'),
                            <span key="tags" className="flex flex-wrap justify-end gap-1.5">
                                {tx.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-[var(--btn-radius)] px-2.5 py-1 text-[12.5px] font-semibold"
                                        style={{ background: 'var(--accent-surface)', color: 'var(--purple-700)' }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </span>,
                        ] as [string, ReactNode],
                    ]
                  : []),
          ]
        : [];

    const receiptName = linkedDoc?.fileName ?? (tx?.documentId != null ? `${t('transactions.detail.receipt')} #${tx.documentId}` : '');
    const receiptExt = linkedDoc?.fileName?.includes('.') ? (linkedDoc.fileName.split('.').pop() ?? 'PDF').toUpperCase() : 'PDF';

    // Value colour of the amount: income green, expense in the plain ink colour.
    const amountColor = kind === 'income' ? 'var(--positive)' : 'var(--foreground)';

    return (
        <>
            {/* Scrim */}
            <div
                className={cn(
                    'fixed inset-0 z-40 bg-[rgba(18,17,24,0.42)] backdrop-blur-[2px] transition-opacity duration-300',
                    open ? 'opacity-100' : 'pointer-events-none opacity-0'
                )}
                onClick={onClose}
            />

            {/* Large file preview to the left of the detail drawer (desktop only), shown when a receipt is linked. */}
            <div
                className={cn(
                    'hidden lg:flex fixed top-0 bottom-0 left-0 z-50 p-4 pointer-events-none transition-transform duration-300 ease-out',
                    open && linkedDoc ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ right: 'var(--drawer-w)', fontFamily: FONT }}
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
                    width: 'var(--drawer-w)',
                    maxWidth: '94vw',
                    background: 'var(--drawer-bg)',
                    boxShadow: 'var(--shadow-lg)',
                    fontFamily: FONT,
                }}
            >
                {/* Sticky header */}
                <div className="flex items-center justify-between border-b border-border-soft px-6 py-5" style={{ background: 'var(--drawer-bg)' }}>
                    <Eyebrow>{editMode ? t('transactions.detail.editTitle') : t('transactions.detail.title')}</Eyebrow>
                    <CloseButton onClick={onClose} />
                </div>

                {isLoading || !tx ? (
                    <DrawerSkeleton />
                ) : !editMode ? (
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Head: direction tile, name and status */}
                        <div className="flex items-center gap-3.5">
                            <TxIcon size={52} incoming={incoming} />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-foreground">{tx.name ?? '—'}</h2>
                                    <StatusBadge tx={tx} size="lg" withInfo />
                                </div>
                                {tx.senderName && <div className="mt-0.5 text-[13.5px] text-muted-foreground">{tx.senderName}</div>}
                            </div>
                        </div>

                        {/* Amount */}
                        <div
                            className="mt-[18px] text-[38px] font-extrabold tabular-nums"
                            style={{ color: incoming ? 'var(--positive)' : 'var(--foreground)' }}
                        >
                            {incoming ? '+ ' : '– '}
                            {fmtCurrency(Math.abs(amount))}
                        </div>

                        {/* Master data */}
                        <div
                            className="mt-[22px] rounded-[var(--r-card)] border border-border-soft px-[18px] py-1.5"
                            style={{ background: 'var(--background-secondary)' }}
                        >
                            {detailRows.map(([label, value]) => (
                                <div key={label} className="flex items-center justify-between gap-4 border-b border-border-soft py-[13px] last:border-b-0">
                                    <span className="text-[13.5px] font-semibold text-muted-foreground">{label}</span>
                                    <span className="text-right text-[14px] font-bold text-foreground">{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Linked receipt */}
                        {tx.documentId != null && (
                            <div className="mt-6">
                                <Eyebrow icon={<FileText size={14} />} className="mb-[11px]">
                                    {t('transactions.detail.receipt')}
                                </Eyebrow>
                                <div
                                    className="flex items-center gap-[13px] rounded-[var(--r-card)] border border-border-soft px-[15px] py-3"
                                    style={{ background: 'var(--background-secondary)' }}
                                >
                                    <span
                                        className="flex-shrink-0 rounded-full px-[11px] py-[7px] text-[12px] font-extrabold tracking-[0.03em]"
                                        style={{ background: 'var(--accent-surface)', color: 'var(--purple-700)' }}
                                    >
                                        {receiptExt}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-foreground">{receiptName}</span>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/receipts?id=${tx.documentId}`)}
                                        className="inline-flex flex-shrink-0 items-center gap-1.5 text-[13.5px] font-extrabold text-purple-700"
                                    >
                                        {t('transactions.detail.openReceipt')}
                                        <ExternalLink size={15} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Payment reconciliation */}
                        <BankMatchSection tx={tx} className="mt-6" />
                    </div>
                ) : (
                    /* Edit form */
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex flex-col gap-4">
                            {/* Direction */}
                            <div className="grid grid-cols-2 gap-2.5">
                                {DIRECTIONS.map(({ id, Icon, ink, tint }) => {
                                    const on = kind === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setKind(id)}
                                            className="flex items-center gap-[11px] rounded-[var(--r-md)] border-[1.5px] px-3.5 py-[11px] text-left transition-colors"
                                            style={{ borderColor: on ? ink : 'var(--border-soft)', background: on ? tint : 'var(--background-secondary)' }}
                                        >
                                            <span
                                                className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-full"
                                                style={{
                                                    background: on ? 'var(--background-secondary)' : 'var(--surface-sunken)',
                                                    color: on ? ink : 'var(--ink-faint)',
                                                }}
                                            >
                                                <Icon size={17} />
                                            </span>
                                            <span className="text-[15px] font-extrabold" style={{ color: on ? ink : 'var(--muted-foreground)' }}>
                                                {t(`transactions.create.${id}`)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Amount + Date */}
                            <div className="grid grid-cols-2 gap-3.5">
                                <Field label={t('transactions.create.amount')}>
                                    <div className="flex h-10 items-center gap-1.5 rounded-[13px] border-[1.5px] border-border-soft bg-[var(--background-secondary)] px-3 transition-shadow focus-within:border-primary focus-within:ring-[3px] focus-within:ring-[var(--accent-surface)]">
                                        <span className="text-[15px] font-extrabold tabular-nums" style={{ color: amountColor }}>
                                            {kind === 'income' ? '+' : '–'}
                                        </span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={amountStr}
                                            onChange={(e) => setAmountStr(e.target.value)}
                                            className="min-w-0 flex-1 bg-transparent p-0 text-right text-[15px] font-extrabold tabular-nums outline-none"
                                            style={{ color: amountColor }}
                                        />
                                        <span className="text-[15px] font-extrabold tabular-nums text-muted-foreground">€</span>
                                    </div>
                                </Field>
                                <Field label={t('transactions.detail.date')}>
                                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                                </Field>
                            </div>

                            {/* Name */}
                            <Field label={t('transactions.create.name')}>
                                <TextField value={name} onValueChange={setName} />
                            </Field>

                            {/* Sender — labelled by direction: income means the counterparty is the recipient. */}
                            <Field label={kind === 'income' ? t('transactions.create.recipient') : t('transactions.create.issuer')}>
                                <TextField value={senderName} onValueChange={setSenderName} />
                            </Field>

                            {/* Bommel */}
                            <Field label={t('transactions.detail.bommel')}>
                                <BommelSelect
                                    items={drawerBommelItems}
                                    value={bommelId ? Number(bommelId) : ALL_BOMMELS}
                                    emptyLabel={t('invoiceUpload.selectBommel')}
                                    onChange={(next) => setBommelId(next === ALL_BOMMELS ? '' : String(next))}
                                    triggerClassName="sm:w-full rounded-xl border-border-soft shadow-none hover:shadow-none"
                                />
                            </Field>

                            {/* Privately paid */}
                            <div
                                className="flex items-center gap-3.5 rounded-[13px] border border-border-soft px-[15px] py-[13px]"
                                style={{ background: 'var(--background-secondary)' }}
                            >
                                <div className="min-w-0 flex-1 text-[13.5px] font-bold text-foreground">{t('transactions.detail.privatelyPaid')}</div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={privatelyPaid}
                                    aria-label={t('transactions.detail.privatelyPaid')}
                                    onClick={() => setPrivatelyPaid((v) => !v)}
                                    className="flex h-[27px] w-[46px] flex-shrink-0 rounded-full p-[3px] transition-colors duration-[var(--dur-mid)]"
                                    style={{
                                        background: privatelyPaid ? 'var(--primary)' : 'var(--border-strong)',
                                        justifyContent: privatelyPaid ? 'flex-end' : 'flex-start',
                                    }}
                                >
                                    <span className="h-[21px] w-[21px] rounded-full bg-white shadow-[0_1px_3px_rgba(24,16,40,0.25)]" />
                                </button>
                            </div>

                            {/* Tags */}
                            <Field label={t('transactions.create.tags')}>
                                <TagInput value={tags} onChange={setTags} placeholder={t('transactions.create.tagsPlaceholder')} />
                            </Field>

                            {/* Category groups (applicable to the selected bommel); draws its own divider and heading. */}
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
                        </div>

                        {/* Zahlungsabgleich – Banktransaktionen direkt beim Bearbeiten verknüpfen. currentTotal feeds
                            the live edited amount+direction so the reconciliation difference updates immediately when
                            income↔expense is flipped (the sign reverses), before the change is saved. */}
                        <BankMatchSection
                            tx={tx}
                            className="mt-6 border-t border-border-soft pt-6"
                            currentTotal={(() => {
                                const raw = parseFloat(amountStr.trim().replace(',', '.'));
                                if (amountStr.trim() === '' || isNaN(raw)) return null;
                                return kind === 'expense' ? -Math.abs(raw) : Math.abs(raw);
                            })()}
                        />
                    </div>
                )}

                {/* Sticky footer */}
                {tx && !isLoading && (
                    <div className="flex items-center gap-2.5 border-t border-border-soft px-6 py-4" style={{ background: 'var(--drawer-bg)' }}>
                        {editMode ? (
                            <>
                                <BaseButton variant="ghost" onClick={() => setEditMode(false)} className={cn(footerBtn, 'text-muted-foreground')}>
                                    {t('transactions.detail.cancel')}
                                </BaseButton>
                                <div className="flex-1" />
                                {/* Saving is always allowed — a draft may stay incomplete. For a draft, Save is the
                                    secondary action and Confirm (gated) the primary one; a confirmed transaction being
                                    edited only offers Save. */}
                                <BaseButton
                                    variant={tx.status === 'DRAFT' ? 'ghost' : 'default'}
                                    onClick={handleSave}
                                    disabled={updateMutation.isPending}
                                    className={cn(
                                        footerBtn,
                                        tx.status === 'DRAFT' && 'bg-[var(--purple-100)] text-[var(--purple-700)] hover:bg-[var(--purple-200)]'
                                    )}
                                >
                                    {tx.status !== 'DRAFT' && <Check size={16} strokeWidth={2.5} />}
                                    {updateMutation.isPending
                                        ? '…'
                                        : tx.status === 'DRAFT'
                                          ? t('transactions.detail.saveDraft')
                                          : t('transactions.detail.save')}
                                </BaseButton>
                                {tx.status === 'DRAFT' && (
                                    <HintTooltip content={confirmBlockers}>
                                        <BaseButton
                                            variant="default"
                                            onClick={handleSaveAndConfirm}
                                            disabled={updateMutation.isPending || confirmMutation.isPending || !canConfirm}
                                            className={footerBtn}
                                        >
                                            <Check size={16} strokeWidth={2.5} />
                                            {confirmMutation.isPending ? '…' : t('transactions.detail.confirm')}
                                        </BaseButton>
                                    </HintTooltip>
                                )}
                            </>
                        ) : (
                            <>
                                <BaseButton
                                    variant="ghost"
                                    onClick={() => setConfirmDeleteOpen(true)}
                                    disabled={deleteMutation.isPending}
                                    className={cn(footerBtn, 'px-4 text-[var(--negative)] hover:bg-[var(--negative-surface)] hover:text-[var(--negative)]')}
                                >
                                    <Trash2 size={16} />
                                    {t('transactions.detail.delete')}
                                </BaseButton>
                                <div className="flex-1" />
                                <BaseButton variant="ghost" onClick={startEdit} className={cn(footerBtn, outlineBtn)}>
                                    <Pencil size={15} />
                                    {t('transactions.detail.edit')}
                                </BaseButton>
                                {tx.status === 'DRAFT' ? (
                                    <HintTooltip content={confirmBlockers}>
                                        <BaseButton
                                            variant="default"
                                            onClick={handleConfirm}
                                            disabled={confirmMutation.isPending || !canConfirm}
                                            className={footerBtn}
                                        >
                                            <Check size={16} strokeWidth={2.5} />
                                            {confirmMutation.isPending ? '…' : t('transactions.detail.confirm')}
                                        </BaseButton>
                                    </HintTooltip>
                                ) : (
                                    <BaseButton
                                        variant="ghost"
                                        onClick={handleReopen}
                                        disabled={reopenMutation.isPending}
                                        className={cn(
                                            footerBtn,
                                            outlineBtn,
                                            'text-[var(--warning)] hover:border-[var(--warning-border)] hover:bg-[var(--warning-surface)]'
                                        )}
                                    >
                                        <RotateCcw size={15} />
                                        {reopenMutation.isPending ? '…' : t('transactions.detail.reopen')}
                                    </BaseButton>
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
