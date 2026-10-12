import { DocumentDirection, DocumentResponse, DocumentUpdateRequest, TransactionResponse } from '@hopps/api-client';
import { Check, ExternalLink, Info, Link2, Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { buildBommelIndex, groupsForBommel } from '@/components/CategoryGroups/helpers';
import { LoadingState } from '@/components/common/LoadingState';
import { flattenBommelTree } from '@/components/Dashboard/bommelTree';
import { DocumentFilePreview } from '@/components/Receipts/DocumentFilePreview';
import { PartBadge, SplitPartRow } from '@/components/Receipts/Split/SplitPartRow';
import { SumBar } from '@/components/Receipts/Split/SumBar';
import { BankMatchSection } from '@/components/Transactions/BankMatchSection';
import { DirectionCards, Field, footerBtn, inputCls } from '@/components/Transactions/drawerParts';
import { Eyebrow } from '@/components/Transactions/Eyebrow';
import { FONT } from '@/components/Transactions/layout';
import { StatusBadge as TxStatusBadge } from '@/components/Transactions/StatusBadge';
import { TxIcon } from '@/components/Transactions/TxIcon';
import { CloseButton } from '@/components/ui/CloseButton';
import { HintTooltip } from '@/components/ui/HintTooltip';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { useBankTransactionsForTransaction } from '@/hooks/queries/useBankAccounts';
import { useCategoryGroups } from '@/hooks/queries/useCategoryGroups';
import { useDocument, useDocumentTransactions, useReplaceDocumentTransactions, useUpdateDocument } from '@/hooks/queries/useDocuments';
import { useConfirmTransaction } from '@/hooks/queries/useTransactions';
import { useToast } from '@/hooks/use-toast';
import {
    addPart,
    autoName,
    createPart,
    formatPartAmount,
    partAmount,
    partErrors,
    removePart,
    setPartAmount,
    setPartBommel,
    sumState,
    toPartPayloads,
    segmentColor,
    visibleErrors,
    type SplitFieldId,
    type SplitGroup,
    type SplitPart,
} from '@/lib/splitParts';
import { getTransactionConfirmState } from '@/lib/transactionConfirm';
import { cn } from '@/lib/utils';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

// Wider than the review drawer: the rows need room for the side-by-side fields.
const DRAWER_WIDTH = 'min(560px, 94vw)';
const EPSILON = 0.005;

function fmtEUR(amount: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

function fmtDate(date: Date | string | null | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toIsoDate(date: Date | string | null | undefined): string {
    return date ? new Date(date).toISOString().slice(0, 10) : '';
}

function categoryValuesOf(tx: TransactionResponse): Record<number, string> {
    const values: Record<number, string> = {};
    (tx.categoryValues ?? []).forEach((c) => {
        if (c.groupId != null && c.value != null) values[c.groupId] = c.value;
    });
    return values;
}

function fromTransaction(tx: TransactionResponse): SplitPart {
    return createPart({
        id: tx.id,
        name: tx.name ?? '',
        amount: formatPartAmount(Math.abs(Number(tx.total ?? 0))),
        bommelId: tx.bommelId ?? null,
        categoryValues: categoryValuesOf(tx),
    });
}

/** How much of a part's amount the linked bank movements cover (magnitude, capped at the amount). */
function coveredOf(tx: TransactionResponse): number {
    const total = Number(tx.total ?? 0);
    const covered = tx.coveredAmount != null ? Number(tx.coveredAmount) : 0;
    if (total === 0 || covered === 0 || Math.sign(total) !== Math.sign(covered)) return 0;
    return Math.min(Math.abs(covered), Math.abs(total));
}

function InfoRows({ rows }: { rows: [string, ReactNode][] }) {
    return (
        <div className="rounded-[var(--r-card)] px-[18px] py-1.5" style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}>
            {rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-border-soft py-[13px] last:border-b-0">
                    <span className="text-[13.5px] font-semibold text-muted-foreground">{label}</span>
                    <span className="min-w-0 break-words text-right text-[14px] font-bold text-foreground">{value}</span>
                </div>
            ))}
        </div>
    );
}

function Notice({ icon, children, tone = 'info' }: { icon: ReactNode; children: ReactNode; tone?: 'info' | 'warn' }) {
    const ink = tone === 'warn' ? 'var(--warning)' : 'var(--info)';
    const bg = tone === 'warn' ? 'var(--warning-surface)' : 'var(--info-surface)';
    return (
        <div
            className="flex items-start gap-3 rounded-[var(--r-card)] border px-4 py-3.5"
            style={{ background: bg, borderColor: `color-mix(in oklch, ${ink} 25%, transparent)` }}
        >
            <span className="mt-px flex-shrink-0" style={{ color: ink }}>
                {icon}
            </span>
            <p className="text-[13.5px] font-semibold leading-snug" style={{ color: ink }}>
                {children}
            </p>
        </div>
    );
}

/**
 * Read view of one part: its values, the bank reconciliation of that transaction and, while it is a draft, the
 * confirm action under the same rules as the transaction drawer.
 */
function ReadPart({
    tx,
    index,
    groups,
    bommelName,
    withBadge,
}: {
    tx: TransactionResponse;
    index: number;
    groups: SplitGroup[];
    bommelName: string | null;
    withBadge?: boolean;
}) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showSuccess } = useToast();
    const confirmMutation = useConfirmTransaction();
    const { data: linkedBankTxns = [] } = useBankTransactionsForTransaction(tx.id);
    const values = categoryValuesOf(tx);
    const total = Number(tx.total ?? 0);
    const income = total >= 0;

    const confirmState = getTransactionConfirmState(
        {
            amount: tx.total != null ? total : null,
            date: toIsoDate(tx.transactionTime) || null,
            counterparty: tx.senderName || null,
            name: tx.name || null,
            bommelId: tx.bommelId ?? null,
        },
        linkedBankTxns
    );
    const missingGroups = groups.filter((g) => g.required && !values[g.id]);
    const canConfirm = confirmState.canConfirm && missingGroups.length === 0;
    const blockers = canConfirm ? null : (
        <>
            <span className="font-bold">{t('transactions.confirmBlockers.title')}</span>
            <span className="mt-0.5 block">
                {[...confirmState.missing.map((m) => t(`transactions.confirmBlockers.${m}`)), ...missingGroups.map((g) => g.name)].join(', ')}
            </span>
        </>
    );

    async function confirm() {
        if (tx.id == null) return;
        try {
            await confirmMutation.mutateAsync(tx.id);
            showSuccess(t('transactions.toast.confirmed'));
        } catch {
            // Shown by the global mutation error handler.
        }
    }

    const rows: [string, ReactNode][] = [
        [
            t('receipts.split.amount'),
            <span key="amount" className="tabular-nums" style={{ color: income ? 'var(--positive)' : 'var(--negative)' }}>
                {income ? '+ ' : '– '}
                {fmtEUR(Math.abs(total))}
            </span>,
        ],
        [t('receipts.split.bommel'), bommelName ?? <span className="text-[var(--ink-faint)]">—</span>],
        ...groups.map((g): [string, ReactNode] => [g.name, values[g.id] ?? <span className="text-[var(--ink-faint)]">—</span>]),
    ];

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
                {withBadge && <PartBadge index={index} colored={false} />}
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-extrabold text-foreground">
                    {tx.name || t('receipts.split.part', { n: index + 1 })}
                </span>
                <TxStatusBadge tx={tx} />
                <button
                    type="button"
                    onClick={() => navigate(`/transactions?id=${tx.id}`)}
                    title={t('receipts.split.openTransaction')}
                    aria-label={t('receipts.split.openTransaction')}
                    className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[11px] border border-border-soft text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground"
                    style={{ background: 'var(--background-secondary)' }}
                >
                    <ExternalLink size={16} />
                </button>
            </div>
            <InfoRows rows={rows} />
            {!tx.privatelyPaid && <BankMatchSection tx={tx} className="mt-1 border-t border-border-soft pt-4" />}
            {tx.status === 'DRAFT' && (
                <div className="flex justify-end">
                    <HintTooltip content={blockers}>
                        <BaseButton variant="default" onClick={confirm} disabled={confirmMutation.isPending || !canConfirm} className={footerBtn}>
                            <Check size={16} strokeWidth={2.5} />
                            {confirmMutation.isPending ? '…' : t('receipts.split.confirmPart')}
                        </BaseButton>
                    </HintTooltip>
                </div>
            )}
        </div>
    );
}

/**
 * Drawer that splits a receipt into several transactions ("Belegsplitting"): one row per part with its own amount,
 * bommel and category-group values. Saving creates (or updates) one transaction per part. Once the document is
 * confirmed the drawer shows the parts read-only with their bank reconciliation; the split stays editable as long as
 * no part has been confirmed.
 */
export function SplitDrawer({ doc: docProp, startInEdit = false, onClose }: { doc: DocumentResponse | null; startInEdit?: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const { showSuccess } = useToast();
    const open = docProp !== null;

    const { data: liveDoc } = useDocument(docProp?.id, { poll: false });
    const doc = liveDoc ?? docProp;
    const { data: savedParts, isLoading: partsLoading } = useDocumentTransactions(doc?.id);
    const updateDocument = useUpdateDocument();
    const replaceParts = useReplaceDocumentTransactions();

    const { data: categoryGroups = [] } = useCategoryGroups();
    const allBommels = useBommelsStore((s) => s.allBommels);
    const bommelIndex = useMemo(() => buildBommelIndex(allBommels), [allBommels]);
    const bommelItems = useMemo(() => flattenBommelTree(allBommels), [allBommels]);
    const groupsFor = useCallback(
        (bommelId: number | null): SplitGroup[] =>
            groupsForBommel(categoryGroups, bommelId, bommelIndex).map((g) => ({ id: g.id as number, name: g.name ?? '', required: !!g.required })),
        [categoryGroups, bommelIndex]
    );
    const bommelNameOf = (bommelId: number | null | undefined): string | null => (bommelId != null ? (bommelIndex.get(bommelId)?.name ?? null) : null);

    const [editing, setEditing] = useState(startInEdit);
    const [parts, setParts] = useState<SplitPart[]>([]);
    const [direction, setDirection] = useState<DocumentDirection>('INCOMING');
    const [date, setDate] = useState('');
    const [counterparty, setCounterparty] = useState('');
    const [attempted, setAttempted] = useState(false);
    const [readTab, setReadTab] = useState<'transactions' | 'receipt'>('transactions');
    const [activeId, setActiveId] = useState<number | null>(null);

    // Per opened document: decide the mode once and forget the seeded form.
    const openedIdRef = useRef<number | null>(null);
    const seededRef = useRef<number | null>(null);
    useEffect(() => {
        if (docProp?.id == null) {
            openedIdRef.current = null;
            seededRef.current = null;
            return;
        }
        if (openedIdRef.current === docProp.id) return;
        openedIdRef.current = docProp.id;
        seededRef.current = null;
        setEditing(startInEdit || docProp.documentStatus !== 'CONFIRMED');
        setReadTab('transactions');
        setActiveId(null);
        setAttempted(false);
    }, [docProp, startInEdit]);

    // Seed the edit form from the saved parts (keeping their ids so saving updates them in place), or from the
    // document when nothing has been booked yet. Entering via "aufteilen" always starts with two parts.
    useEffect(() => {
        if (doc?.id == null || !editing || partsLoading || savedParts === undefined) return;
        if (seededRef.current === doc.id) return;
        seededRef.current = doc.id;
        setDirection(doc.direction ?? 'INCOMING');
        setDate(toIsoDate(doc.transactionTime));
        setCounterparty(doc.senderName ?? '');
        const total = Math.abs(Number(doc.total ?? 0));
        let seeded: SplitPart[] = savedParts.length > 0 ? savedParts.map(fromTransaction) : [createPart({ bommelId: doc.bommelId ?? null, rest: true })];
        if (seeded.length === 1) seeded = [{ ...seeded[0], rest: true }];
        if (seeded.length === 1 && startInEdit) seeded = addPart(seeded, total);
        setParts(seeded);
        setAttempted(false);
    }, [doc, editing, partsLoading, savedParts, startInEdit]);

    // ── Edit mode: derived state ──
    const total = Math.abs(Number(doc?.total ?? 0));
    const hasTotal = doc?.total != null && total > 0;
    const sum = sumState(total, parts);
    const perPart = parts.map((part, index) => {
        const amount = partAmount(part, total, parts);
        const groups = groupsFor(part.bommelId);
        const errors = partErrors(part, amount, groups);
        return { part, index, amount, groups, errors, visible: visibleErrors(part, errors, attempted) };
    });
    const fieldLabel = (field: SplitFieldId, label?: string) => label ?? (field === 'amount' ? t('receipts.split.amount') : t('receipts.split.bommel'));
    const reasons: string[] = [
        ...(hasTotal ? [] : [t('receipts.split.noTotalShort')]),
        ...perPart
            .filter((x) => x.errors.length > 0)
            .map((x) => `${t('receipts.split.part', { n: x.index + 1 })}: ${x.errors.map((e) => fieldLabel(e.field, e.label)).join(', ')}`),
        ...(sum.over ? [t('receipts.split.over', { amount: fmtEUR(-sum.diff) })] : []),
    ];
    const blocked = attempted && reasons.length > 0;
    const nameOf = (part: SplitPart, index: number) =>
        autoName(part, bommelNameOf(part.bommelId), groupsFor(part.bommelId), t('receipts.split.part', { n: index + 1 }));

    const updatePart = (key: string, patch: Partial<SplitPart>) => setParts((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
    const touch = (key: string, field: SplitFieldId) =>
        setParts((prev) => prev.map((p) => (p.key === key ? { ...p, touched: { ...p.touched, [field]: true } } : p)));

    const busy = updateDocument.isPending || replaceParts.isPending;

    async function save(confirmDocument: boolean) {
        if (doc?.id == null) return;
        if (confirmDocument && reasons.length > 0) {
            setAttempted(true);
            return;
        }
        try {
            // Header data lives on the document; the parts are the transactions.
            await updateDocument.mutateAsync(
                Object.assign(
                    new DocumentUpdateRequest({
                        transactionDate: date || undefined,
                        senderName: counterparty || undefined,
                        direction,
                        privatelyPaid: doc.privatelyPaid ?? false,
                    }),
                    { id: doc.id }
                )
            );
            await replaceParts.mutateAsync({ id: doc.id, parts: toPartPayloads(parts, total, nameOf), confirmDocument });
        } catch {
            // Shown by the global mutation error handler.
            return;
        }
        if (confirmDocument) {
            showSuccess(parts.length > 1 ? t('receipts.split.toast.created', { n: parts.length }) : t('receipts.toast.transactionCreated'));
            setEditing(false);
            // Straight to the parts: the next step is linking each of them to its bank movement.
            setReadTab('transactions');
            setActiveId(null);
        } else {
            showSuccess(t('receipts.split.toast.draftSaved'));
            onClose();
        }
    }

    function startEditing() {
        seededRef.current = null;
        setEditing(true);
    }

    // ── Read mode: derived state ──
    const readParts = savedParts ?? [];
    const partsTotal = readParts.reduce((s, p) => s + Math.abs(Number(p.total ?? 0)), 0);
    const coveredTotal = readParts.reduce((s, p) => s + coveredOf(p), 0);
    const coverageOk = partsTotal > 0 && Math.abs(partsTotal - coveredTotal) < EPSILON;
    const notBooked = Math.max(0, total - partsTotal);
    const activePart = readParts.find((p) => p.id === activeId) ?? readParts[0];
    const activeIndex = activePart ? readParts.indexOf(activePart) : 0;
    const canEditSplit = readParts.length > 0 && readParts.every((p) => p.status !== 'CONFIRMED');
    const income = doc?.direction === 'OUTGOING';

    const receiptRows: [string, ReactNode][] = doc
        ? [
              [
                  t('receipts.review.amount'),
                  <span key="amount" className="tabular-nums font-extrabold" style={{ color: income ? 'var(--positive)' : 'var(--negative)' }}>
                      {doc.total != null ? `${income ? '+' : '–'} ${fmtEUR(total)}` : '—'}
                  </span>,
              ],
              ...(doc.totalTax != null ? [[t('receipts.review.tax'), fmtEUR(Number(doc.totalTax))] as [string, ReactNode]] : []),
              [t('receipts.review.receiptDate'), fmtDate(doc.transactionTime)],
              [income ? t('receipts.review.recipient') : t('receipts.review.sender'), doc.senderName || '—'],
              [t('receipts.review.fileName'), doc.fileName || '—'],
              [t('receipts.review.uploadedAt'), fmtDate(doc.createdAt)],
          ]
        : [];

    const createLabel = parts.length > 1 ? t('receipts.split.createMany', { n: parts.length }) : t('receipts.split.createOne');

    return (
        <>
            <div
                className={cn('fixed inset-0 z-40 bg-black/25 transition-opacity duration-300', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
                onClick={onClose}
            />
            <div
                className={cn(
                    'pointer-events-none fixed bottom-0 left-0 top-0 z-50 hidden p-4 transition-transform duration-300 ease-out lg:flex',
                    open ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ right: DRAWER_WIDTH, fontFamily: FONT }}
            >
                {doc && <DocumentFilePreview doc={doc} />}
            </div>
            <div
                className={cn(
                    'fixed right-0 top-0 z-50 flex h-full flex-col transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : 'translate-x-full'
                )}
                style={{ width: DRAWER_WIDTH, background: 'var(--drawer-bg)', boxShadow: 'var(--shadow-lg)', fontFamily: FONT }}
                data-testid="split-drawer"
            >
                <div className="flex items-center justify-between gap-3 border-b border-border-soft px-6 py-5" style={{ background: 'var(--drawer-bg)' }}>
                    <div className="min-w-0">
                        <Eyebrow>{editing ? t('receipts.split.eyebrowEdit') : t('receipts.review.eyebrowView')}</Eyebrow>
                        {doc && <h2 className="mt-1 truncate text-[19px] font-extrabold text-foreground">{doc.fileName}</h2>}
                    </div>
                    <CloseButton onClick={onClose} />
                </div>

                {!doc || (editing && partsLoading) ? (
                    <div className="flex flex-1 items-center justify-center">
                        <LoadingState />
                    </div>
                ) : editing ? (
                    <>
                        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
                            <DirectionCards
                                value={direction === 'OUTGOING' ? 'income' : 'expense'}
                                onChange={(id) => setDirection(id === 'income' ? 'OUTGOING' : 'INCOMING')}
                                labels={{ expense: t('receipts.direction.incoming'), income: t('receipts.direction.outgoing') }}
                                hints={{ expense: t('receipts.direction.incomingHint'), income: t('receipts.direction.outgoingHint') }}
                                ariaLabel={t('receipts.direction.label')}
                            />
                            <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                                <Field label={t('receipts.split.date')}>
                                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                                </Field>
                                <Field label={t('receipts.split.counterparty')}>
                                    <input type="text" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} className={inputCls} />
                                </Field>
                            </div>

                            <div className="mt-1 flex flex-col gap-2.5">
                                <Eyebrow>{t('receipts.split.section')}</Eyebrow>
                                {!hasTotal && (
                                    <Notice icon={<Info size={18} />} tone="warn">
                                        {t('receipts.split.noTotal')}
                                    </Notice>
                                )}
                                <SumBar
                                    value={fmtEUR(sum.assigned)}
                                    total={t('receipts.split.of', { total: fmtEUR(total) })}
                                    ok={!sum.over && sum.unassigned === 0 && hasTotal}
                                    tone={sum.over ? 'warn' : 'neutral'}
                                    message={
                                        sum.over
                                            ? t('receipts.split.over', { amount: fmtEUR(-sum.diff) })
                                            : sum.unassigned > 0
                                              ? t('receipts.split.unassigned', { amount: fmtEUR(sum.unassigned) })
                                              : t('receipts.split.sumOk')
                                    }
                                    segments={perPart.map((x) => ({
                                        key: x.part.key,
                                        value: x.amount,
                                        color: segmentColor(x.index),
                                        title: `${nameOf(x.part, x.index)}: ${fmtEUR(x.amount)}`,
                                    }))}
                                />
                                {perPart.map((x) => (
                                    <SplitPartRow
                                        key={x.part.key}
                                        part={x.part}
                                        index={x.index}
                                        amount={x.amount}
                                        groups={x.groups}
                                        errors={x.visible}
                                        bommelItems={bommelItems}
                                        bommelName={bommelNameOf(x.part.bommelId)}
                                        onAmountChange={(v) => setParts((prev) => setPartAmount(prev, x.part.key, v))}
                                        onBommelChange={(id) =>
                                            setParts((prev) => prev.map((p) => (p.key === x.part.key ? setPartBommel(p, id, groupsFor) : p)))
                                        }
                                        onCategoryChange={(groupId, value) => {
                                            const next = { ...x.part.categoryValues };
                                            if (value == null || value === '') delete next[groupId];
                                            else next[groupId] = value;
                                            updatePart(x.part.key, { categoryValues: next });
                                        }}
                                        onTouch={(field) => touch(x.part.key, field)}
                                        onRemove={() => setParts((prev) => removePart(prev, x.part.key))}
                                    />
                                ))}
                                <BaseButton
                                    variant="outline"
                                    onClick={() => setParts((prev) => addPart(prev, total))}
                                    className="h-[42px] w-full gap-2 rounded-[var(--btn-radius)] border-border-soft bg-[var(--background-secondary)] text-[14px] font-bold"
                                >
                                    <Plus size={16} />
                                    {t('receipts.split.addPart')}
                                </BaseButton>
                            </div>

                            <div className="mt-2 border-t border-border-soft pt-5">
                                <Eyebrow icon={<Link2 size={14} />} className="mb-[11px]">
                                    {t('receipts.review.paymentMatching')}
                                </Eyebrow>
                                <Notice icon={<Info size={18} />}>{t('receipts.split.linkLater')}</Notice>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 border-t border-border-soft px-6 py-4" style={{ background: 'var(--drawer-bg)' }}>
                            <BaseButton variant="ghost" onClick={() => save(false)} disabled={busy} className={cn(footerBtn, 'text-muted-foreground')}>
                                {t('receipts.split.saveDraft')}
                            </BaseButton>
                            <div className="flex-1" />
                            <HintTooltip
                                content={
                                    blocked ? (
                                        <>
                                            <span className="font-bold">{t('receipts.split.incomplete')}</span>
                                            {reasons.map((r) => (
                                                <span key={r} className="mt-0.5 block tabular-nums">
                                                    {r}
                                                </span>
                                            ))}
                                        </>
                                    ) : null
                                }
                            >
                                <BaseButton variant="default" onClick={() => save(true)} disabled={busy || blocked} className={footerBtn}>
                                    <Check size={16} strokeWidth={2.5} />
                                    {replaceParts.isPending ? '…' : createLabel}
                                </BaseButton>
                            </HintTooltip>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
                            <div className="flex gap-0.5 rounded-xl p-1" style={{ background: 'var(--surface-track)' }}>
                                {/* The receipt comes first, the transactions booked from it to its right. */}
                                {(['transactions', 'receipt'] as const).map((tabKey) => (
                                    <button
                                        key={tabKey}
                                        type="button"
                                        onClick={() => setReadTab(tabKey)}
                                        className={cn(
                                            'flex-1 rounded-[var(--btn-radius)] px-3 py-1.5 text-[13.5px] font-bold transition-colors',
                                            readTab === tabKey
                                                ? 'bg-[var(--background-secondary)] text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {tabKey === 'receipt'
                                            ? t('receipts.split.tabReceipt')
                                            : readParts.length > 1
                                              ? t('receipts.split.tabTransactions')
                                              : t('receipts.split.tabTransaction')}
                                    </button>
                                ))}
                            </div>

                            {readTab === 'receipt' ? (
                                <>
                                    <div className="flex items-center gap-3.5">
                                        <TxIcon size={44} incoming={income} />
                                        <div className="min-w-0">
                                            <div className="truncate text-[16px] font-extrabold text-foreground">
                                                {doc.senderName || doc.name || doc.fileName}
                                            </div>
                                            <div className="mt-0.5 text-[12.5px] text-muted-foreground tabular-nums">
                                                {t('receipts.review.uploadedOn', { date: fmtDate(doc.createdAt) })}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Eyebrow className="mb-[11px]">{t('receipts.review.masterData')}</Eyebrow>
                                        <InfoRows rows={receiptRows} />
                                    </div>
                                </>
                            ) : partsLoading ? (
                                <LoadingState className="py-6" />
                            ) : readParts.length === 0 ? (
                                <div
                                    className="rounded-[var(--r-card)] px-4 py-3.5 text-[13.5px] text-muted-foreground"
                                    style={{ background: 'var(--surface-sunken)' }}
                                >
                                    {t('receipts.review.noTransaction')}
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <Eyebrow className="mb-2">
                                        {readParts.length > 1 ? t('receipts.split.fromReceipt') : t('receipts.split.fromReceiptOne')}
                                    </Eyebrow>
                                    {readParts.length > 1 && (
                                        <div className="mb-3">
                                            <SumBar
                                                value={fmtEUR(coveredTotal)}
                                                total={t('receipts.split.of', { total: fmtEUR(partsTotal) })}
                                                ok={coverageOk}
                                                message={
                                                    coverageOk
                                                        ? t('receipts.split.covered')
                                                        : t('receipts.split.uncovered', { amount: fmtEUR(partsTotal - coveredTotal) })
                                                }
                                                segments={readParts.map((p, i) => ({
                                                    key: String(p.id),
                                                    value: coveredOf(p),
                                                    color: segmentColor(i),
                                                    title: `${p.name ?? ''}: ${fmtEUR(coveredOf(p))}`,
                                                }))}
                                                activeKey={activePart ? String(activePart.id) : null}
                                                onSelect={(key) => setActiveId(Number(key))}
                                                footer={
                                                    notBooked > EPSILON ? (
                                                        <span className="text-[12px] font-semibold text-muted-foreground tabular-nums">
                                                            {t('receipts.split.notBooked', { amount: fmtEUR(notBooked) })}
                                                        </span>
                                                    ) : undefined
                                                }
                                            />
                                        </div>
                                    )}
                                    {readParts.length > 1 && (
                                        <div className="relative z-[1] -mb-px flex items-end gap-0.5 overflow-x-auto pt-1" style={{ scrollbarWidth: 'thin' }}>
                                            {readParts.map((p, i) => {
                                                const on = p.id === activePart?.id;
                                                return (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => setActiveId(p.id ?? null)}
                                                        title={p.name ?? undefined}
                                                        className="flex min-w-[130px] flex-1 items-center gap-2 px-3 py-2.5 text-left"
                                                        style={{
                                                            borderRadius: '11px 11px 0 0',
                                                            border: `1px solid ${on ? 'var(--border-soft)' : 'transparent'}`,
                                                            borderBottom: `1px solid ${on ? 'var(--background-secondary)' : 'transparent'}`,
                                                            background: on ? 'var(--background-secondary)' : 'transparent',
                                                            color: on ? 'var(--foreground)' : 'var(--muted-foreground)',
                                                        }}
                                                    >
                                                        <PartBadge index={i} />
                                                        <span className="flex min-w-0 flex-1 flex-col">
                                                            <span className="truncate text-[13px] font-extrabold">
                                                                {p.name || t('receipts.split.part', { n: i + 1 })}
                                                            </span>
                                                            <span className="text-[11.5px] font-semibold text-muted-foreground tabular-nums">
                                                                {fmtEUR(Math.abs(Number(p.total ?? 0)))}
                                                            </span>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {activePart && (
                                        <div
                                            className="border border-border-soft px-4 pb-[18px] pt-4"
                                            style={{
                                                background: 'var(--background-secondary)',
                                                borderRadius:
                                                    readParts.length > 1 && activeIndex === 0 ? '0 var(--r-card) var(--r-card) var(--r-card)' : 'var(--r-card)',
                                            }}
                                        >
                                            <ReadPart
                                                key={activePart.id}
                                                tx={activePart}
                                                index={activeIndex}
                                                groups={groupsFor(activePart.bommelId ?? null)}
                                                bommelName={bommelNameOf(activePart.bommelId)}
                                                withBadge={readParts.length === 1}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2.5 border-t border-border-soft px-6 py-4" style={{ background: 'var(--drawer-bg)' }}>
                            <HintTooltip content={canEditSplit || readParts.length === 0 ? null : t('receipts.split.editSplitLocked')}>
                                <BaseButton variant="ghost" onClick={startEditing} disabled={!canEditSplit} className={cn(footerBtn, 'text-muted-foreground')}>
                                    <Pencil size={15} />
                                    {t('receipts.split.editSplit')}
                                </BaseButton>
                            </HintTooltip>
                            <div className="flex-1" />
                            <BaseButton variant="tonal" onClick={onClose} className={footerBtn}>
                                {t('common.close')}
                            </BaseButton>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
