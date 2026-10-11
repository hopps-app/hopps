import { BankTransactionResponse, DocumentResponse } from '@hopps/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ExternalLink, FileCheck2, FileText, Info, Landmark, Link2, Loader2, Plus, Receipt, Sparkles, Unlink, Upload } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import { Trans, useTranslation } from 'react-i18next';

import { CreateTransactionDrawer } from '@/components/BankAccounts/CreateTransactionDrawer';
import { fmtDate } from '@/components/BankAccounts/format';
import { TransactionMatchPicker } from '@/components/BankAccounts/TransactionMatchPicker';
import { DocumentFilePreview } from '@/components/Receipts/DocumentFilePreview';
import { Eyebrow } from '@/components/Transactions/Eyebrow';
import { FONT } from '@/components/Transactions/layout';
import { MatchAllocationControl } from '@/components/Transactions/MatchAllocationControl';
import { Badge, type BadgeTone } from '@/components/Transactions/StatusBadge';
import { CloseButton } from '@/components/ui/CloseButton';
import { HintTooltip } from '@/components/ui/HintTooltip';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { ReviewDrawer } from '@/components/views/BelegeView';
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
import { useTransaction } from '@/hooks/queries/useTransactions';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import apiService from '@/services/ApiService';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

const EPS = 0.005;

// Square icon button used on the cards (Transaktion öffnen, Verknüpfung lösen).
const ICON_BTN =
    'grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[11px] border border-border-soft bg-[var(--background-secondary)] text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground disabled:opacity-50';
const UNLINK_BTN = cn(ICON_BTN, 'hover:border-[var(--negative-border)] hover:text-[var(--negative)]');
// Tonal small button: the unified row action that opens an item in a drawer ("Prüfen").
const TONAL_SM =
    'inline-flex h-[34px] flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--btn-radius)] bg-[var(--purple-100)] px-3.5 text-[13px] font-bold text-[var(--purple-700)] transition-colors hover:bg-[var(--purple-200)]';
// Footer buttons, as in the transaction drawer.
const FOOTER_BTN = 'h-[42px] gap-2 rounded-[var(--btn-radius)] px-5 text-[14.5px] font-bold';
const ACCEPT = { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] };

// Progress bar segment colours, one per linked transaction in link order. Purely visual: they only tell neighbouring
// segments apart and carry no meaning.
const SEGMENT_COLORS = ['#9955CC', '#3E9C8C', '#E0A33A', '#4F7FD1', '#D16A9B', '#7E8A3A'];
const segmentColor = (i: number) => SEGMENT_COLORS[i % SEGMENT_COLORS.length];

// ─── Building blocks ─────────────────────────────────────────────────────────

function IconTile({ size = 36, bg, fg, children }: { size?: number; bg: string; fg: string; children: ReactNode }) {
    return (
        <span
            className="grid flex-shrink-0 place-items-center"
            style={{ width: size, height: size, borderRadius: size >= 44 ? 13 : 10, background: bg, color: fg }}
        >
            {children}
        </span>
    );
}

// Card of the drawer's items (receipts, transactions): same surface and shadow as the bank card on top.
function FlatCard({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div
            className={cn('rounded-[var(--r-card)] px-[15px] py-[13px]', className)}
            style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}
        >
            {children}
        </div>
    );
}

const HINT_TONE = {
    ai: { bg: 'var(--accent-surface)', icon: 'var(--purple-700)', text: 'text-muted-foreground' },
    neutral: { bg: 'var(--surface-track)', icon: 'var(--muted-foreground)', text: 'text-muted-foreground' },
    warn: { bg: 'var(--warning-surface)', icon: 'var(--warning)', text: 'text-foreground' },
};

function Hint({ tone, icon, children }: { tone: keyof typeof HINT_TONE; icon: ReactNode; children: ReactNode }) {
    const style = HINT_TONE[tone];
    return (
        <div className="mt-[11px] flex items-start gap-2.5 rounded-[12px] px-3 py-2.5" style={{ background: style.bg }}>
            <span className="mt-px flex-shrink-0" style={{ color: style.icon }}>
                {icon}
            </span>
            <span className={cn('min-w-0 flex-1 text-[12.5px] leading-[1.45]', style.text)}>{children}</span>
        </div>
    );
}

/**
 * Says where the values of a draft transaction created from a receipt come from, by the receipt's extraction source:
 * the AI (Document AI) or the ZUGFeRD data embedded in an e-invoice. A receipt without extracted data gets no hint.
 */
function SourceHint({ doc }: { doc: DocumentResponse }) {
    const { t } = useTranslation();
    if (doc.extractionSource === 'AI') {
        return (
            <Hint tone="ai" icon={<Sparkles size={15} />}>
                {t('konten.drawer.aiCreatedHint')}
            </Hint>
        );
    }
    if (doc.extractionSource === 'ZUGFERD') {
        return (
            <Hint tone="neutral" icon={<FileCheck2 size={15} />}>
                {t('konten.drawer.zugferdCreatedHint')}
            </Hint>
        );
    }
    return null;
}

// Status of the bank movement, with the labels of the Konten list: Offen, Teilweise, Zugeordnet, Ignoriert.
const BANK_STATUS: Record<string, { tone: BadgeTone; labelKey: string }> = {
    UNMATCHED: { tone: 'warn', labelKey: 'konten.status.open' },
    PARTIALLY_MATCHED: { tone: 'warn', labelKey: 'konten.status.partial' },
    FULLY_MATCHED: { tone: 'pos', labelKey: 'konten.status.matched' },
    IGNORED: { tone: 'neutral', labelKey: 'konten.status.ignored' },
};

function BankStatusBadge({ status }: { status?: string }) {
    const { t } = useTranslation();
    const style = BANK_STATUS[status ?? 'UNMATCHED'] ?? BANK_STATUS.UNMATCHED;
    return <Badge tone={style.tone}>{t(style.labelKey)}</Badge>;
}

// The bank movement this drawer assigns: counterparty, date and purpose, amount, account and booking type.
function BankCard({ bankTx }: { bankTx: BankTransactionResponse }) {
    const { format } = useCurrency();
    const amount = bankTx.amount ?? 0;
    const incoming = amount >= 0;
    return (
        <div className="rounded-[var(--r-card)] px-5 py-[18px]" style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}>
            <div className="flex items-start gap-[13px]">
                <IconTile size={44} bg="var(--surface-track)" fg="var(--muted-foreground)">
                    <Landmark size={21} />
                </IconTile>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-extrabold text-foreground">{bankTx.counterpartyName || '—'}</div>
                    {/* Account (with its colour, as in the Konten list) and booking date */}
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
                        {bankTx.bankAccountName && (
                            <>
                                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: bankTx.bankAccountColor || 'var(--primary)' }} />
                                <span className="truncate font-semibold text-foreground">{bankTx.bankAccountName}</span>
                                <span aria-hidden="true">·</span>
                            </>
                        )}
                        <span className="flex-shrink-0 tabular-nums">{fmtDate(bankTx.bookingDate)}</span>
                    </div>
                    {bankTx.transactionType && (
                        <div className="mt-1 text-[11.5px] font-bold uppercase tracking-[0.04em] text-[var(--ink-faint)]">{bankTx.transactionType}</div>
                    )}
                    {/* The full purpose ("Verwendungszweck") wraps instead of truncating, so a long reference stays readable. */}
                    {bankTx.purpose && <div className="mt-1 break-words text-[13px] leading-[1.45] text-muted-foreground">{bankTx.purpose}</div>}
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                    <BankStatusBadge status={bankTx.status} />
                    <span
                        className="whitespace-nowrap text-[19px] font-extrabold tabular-nums"
                        style={{ color: incoming ? 'var(--positive)' : 'var(--foreground)' }}
                    >
                        {incoming ? '+ ' : '– '}
                        {format(Math.abs(amount), { currency: bankTx.currency })}
                    </span>
                </div>
            </div>
        </div>
    );
}

// A receipt being uploaded onto the movement.
function ReadingCard({ fileName }: { fileName: string }) {
    const { t } = useTranslation();
    return (
        <FlatCard className="flex items-center gap-3.5 px-[18px] py-4">
            <IconTile size={44} bg="var(--accent-surface)" fg="var(--purple-700)">
                <Loader2 size={20} className="animate-spin" />
            </IconTile>
            <div className="min-w-0">
                <div className="text-[15px] font-extrabold text-foreground">{t('konten.drawer.readingTitle')}</div>
                <div className="mt-0.5 truncate text-[13px] text-muted-foreground">{t('konten.drawer.readingHint', { file: fileName })}</div>
            </div>
        </FlatCard>
    );
}

// A transaction linked to the movement, with the portion of the movement it uses.
function LinkedTxCard({
    txId,
    used,
    movementMagnitude,
    currency,
    onUnlink,
    onUpdateUsed,
    onReview,
    busy,
    color,
}: {
    txId: number;
    used: number | undefined;
    movementMagnitude: number;
    currency?: string;
    onUnlink: () => void;
    onUpdateUsed: (amount: number) => void;
    onReview: (doc: DocumentResponse) => void;
    busy: boolean;
    /** Colour of this transaction's segment in the progress bar, repeated on the icon tile. Visual only. */
    color: string;
}) {
    const { t } = useTranslation();
    const { format } = useCurrency();
    const { data: tx } = useTransaction(txId);
    const { data: doc } = useDocument(tx?.documentId ?? undefined, { poll: false });
    if (!tx) return null;

    const amount = Math.abs(tx.total ?? 0);
    const usedAmount = used ?? Math.min(amount, movementMagnitude);
    // A draft created from a receipt: reviewed and confirmed in "Beleg prüfen", not opened as a plain transaction.
    const fromReceipt = tx.status === 'DRAFT' && tx.documentId != null;
    const higherBy = amount - usedAmount;
    // "Prüfen" only while the receipt itself still waits for review (not confirmed); otherwise the card opens the
    // transaction like any other.
    const receiptToReview = doc != null && doc.documentStatus !== 'CONFIRMED';

    const confirmed = tx.status === 'CONFIRMED';
    const partial = usedAmount < amount - EPS;

    return (
        <FlatCard>
            <div className="flex items-start gap-3">
                <IconTile bg={`color-mix(in oklab, ${color} 16%, transparent)`} fg={color}>
                    {tx.documentId != null ? <FileText size={17} /> : <Receipt size={17} />}
                </IconTile>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold text-foreground">{tx.name || '—'}</div>
                    <div className="mt-px truncate text-[12.5px] text-muted-foreground">
                        {fmtDate(tx.transactionTime)} · {(fromReceipt && doc?.fileName) || tx.senderName || '—'}
                    </div>
                </div>
            </div>
            {fromReceipt &&
                (higherBy > EPS ? (
                    <Hint tone="warn" icon={<Info size={15} />}>
                        {t('konten.drawer.receiptHigherHint', { amount: format(higherBy, { currency }) })}
                    </Hint>
                ) : (
                    doc && <SourceHint doc={doc} />
                ))}
            {/* Actions: the used amount (editable unless the transaction is confirmed), unlink, then the way into the
                transaction last: "Prüfen" while its receipt is not confirmed yet, otherwise open it in a new tab. */}
            <div className="mt-2.5 flex flex-wrap items-center gap-[9px]">
                <span className="text-[15px] font-extrabold tabular-nums">{format(amount, { currency: tx.currencyCode })}</span>
                <div className="flex-1" />
                {confirmed ? (
                    partial && (
                        <span className="inline-flex flex-shrink-0 items-center rounded-full bg-[var(--warning-surface)] px-2.5 py-[5px] text-[12.5px] font-bold tabular-nums text-[var(--warning)]">
                            {t('transactions.detail.usedAmount', { amount: format(usedAmount, { currency }) })}
                        </span>
                    )
                ) : (
                    <MatchAllocationControl
                        variant="card"
                        amount={usedAmount}
                        max={movementMagnitude}
                        full={amount}
                        currency={currency}
                        pending={busy}
                        onSave={onUpdateUsed}
                    />
                )}
                <HintTooltip content={t('konten.drawer.unlink')}>
                    <button type="button" onClick={onUnlink} disabled={busy} aria-label={t('konten.drawer.unlink')} className={UNLINK_BTN}>
                        <Unlink size={15} />
                    </button>
                </HintTooltip>
                {receiptToReview ? (
                    <button type="button" onClick={() => onReview(doc)} className={TONAL_SM}>
                        {t('konten.drawer.review')}
                        <ChevronRight size={15} />
                    </button>
                ) : (
                    <HintTooltip content={t('konten.drawer.openTransactionNewTab')}>
                        <button
                            type="button"
                            onClick={() => window.open(`/transactions?id=${tx.id}`, '_blank', 'noopener,noreferrer')}
                            aria-label={t('konten.drawer.openTransactionNewTab')}
                            className={ICON_BTN}
                        >
                            <ExternalLink size={16} />
                        </button>
                    </HintTooltip>
                )}
            </div>
        </FlatCard>
    );
}

// ─── MatchDrawer ─────────────────────────────────────────────────────────────

interface MatchDrawerProps {
    bankTxId: number;
    onClose: () => void;
}

/**
 * "Kontoumsatz zuordnen": assigns one bank movement to bookkeeping transactions. Mirrors the Zahlungsabgleich section of
 * the transaction drawer in the other direction. Every link is saved right away; the footer button only closes.
 * <p>
 * A receipt uploaded here creates a DRAFT transaction prefilled from the movement and links it right away; the receipt
 * is then reviewed and confirmed in "Beleg prüfen" (opened on top of this drawer).
 */
export function MatchDrawer({ bankTxId, onClose }: MatchDrawerProps) {
    const { t } = useTranslation();
    const { format } = useCurrency();
    const queryClient = useQueryClient();

    const { data: bankTx } = useBankTransaction(bankTxId);
    const { data: matchAllocs = [] } = useBankTransactionMatches(bankTxId);

    const createReceipt = useCreateReceiptForBankTransaction();
    const addMatch = useAddBankTransactionMatch();
    const removeMatch = useRemoveBankTransactionMatch();
    const updateMatchAmount = useUpdateBankTransactionMatchAmount();
    const ignoreTx = useIgnoreBankTransaction();
    const unignoreTx = useMutation({
        mutationFn: (id: number) => apiService.orgService.ignoreDELETE(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: bankTransactionKeys.all }),
    });

    const [pickerOpen, setPickerOpen] = useState(false);
    // Portion the picker's current selection would assign, previewed in the summary.
    const [preview, setPreview] = useState(0);
    const [showCreate, setShowCreate] = useState(false);
    // File being uploaded right now (before the backend has created the document).
    const [uploadingName, setUploadingName] = useState<string | null>(null);
    // "Beleg prüfen" opened on top of this drawer.
    const [reviewDoc, setReviewDoc] = useState<DocumentResponse | null>(null);
    // A candidate's receipt shown to the left of the drawer.
    const [previewDocId, setPreviewDocId] = useState<number | null>(null);
    const { data: previewDoc } = useDocument(previewDocId ?? undefined, { poll: false });

    // The bommel store is populated on demand per view and the Konten page does not load it, so fetch it when "Beleg
    // prüfen" opens (its bommel selector would be empty otherwise).
    const organizationId = useStore((s) => s.organization?.id);
    const bommelsLoaded = useBommelsStore((s) => s.allBommels.length > 0);
    const loadBommels = useBommelsStore((s) => s.loadBommels);
    useEffect(() => {
        if (reviewDoc && organizationId && !bommelsLoaded) {
            loadBommels(organizationId);
        }
    }, [reviewDoc, organizationId, bommelsLoaded, loadBommels]);

    // Drag and drop (or click) a receipt. The upload creates its draft transaction and links it, so the drawer stays open
    // and shows the new link.
    const {
        getRootProps,
        getInputProps,
        isDragActive,
        open: openFilePicker,
    } = useDropzone({
        onDrop: async (acceptedFiles) => {
            const file = acceptedFiles[0];
            if (!file) return;
            setPickerOpen(false);
            setUploadingName(file.name);
            try {
                await createReceipt.mutateAsync({ bankTxId, file });
            } catch {
                // The error toast (including the "already uploaded" 409 case) is shown by the mutation's onError.
            } finally {
                setUploadingName(null);
            }
        },
        multiple: false,
        accept: ACCEPT,
        disabled: createReceipt.isPending,
    });

    if (!bankTx) return null;

    const ignored = bankTx.status === 'IGNORED';
    const magnitude = Math.abs(bankTx.amount ?? 0);
    const linkedIds = new Set(matchAllocs.map((m) => m.transactionId!).filter((id) => id != null));
    const assigned = matchAllocs.reduce((s, m) => s + (m.amount ?? 0), 0);
    const rest = Math.max(0, magnitude - assigned);
    const covered = rest <= EPS;

    const reading = uploadingName != null;
    const hasLinks = matchAllocs.length > 0;

    const barPreview = Math.min(rest, preview);
    const pct = (v: number) => `${magnitude > 0 ? Math.min(100, (v / magnitude) * 100) : 0}%`;

    const summary = [
        { key: 'total', label: t('konten.drawer.sumAmount'), value: magnitude, color: 'var(--foreground)' },
        {
            key: 'assigned',
            label: t('konten.drawer.sumAssigned'),
            value: assigned + preview,
            color: preview > EPS ? 'var(--purple-700)' : assigned > EPS ? 'var(--positive)' : 'var(--ink-faint)',
        },
        // Only while something is assigned (or previewed) and a rest is still open, as in the transaction drawer: before
        // that it would just repeat the amount, and once covered there is nothing open.
        ...(assigned + preview > EPS && rest - preview > EPS
            ? [{ key: 'open', label: t('konten.drawer.sumOpen'), value: rest - preview, color: 'var(--warning)' }]
            : []),
    ];

    async function link(transactionId: number, amount: number | undefined) {
        await addMatch.mutateAsync({ bankTxId, transactionId, amount });
        setPickerOpen(false);
        setPreview(0);
    }

    function closePicker() {
        setPickerOpen(false);
        setPreview(0);
    }

    async function handleIgnore() {
        await ignoreTx.mutateAsync(bankTxId);
        onClose();
    }

    return (
        <>
            {/* Scrim */}
            <div className="fixed inset-0 z-40 bg-[rgba(18,17,24,0.42)] backdrop-blur-[2px]" onClick={onClose} />

            {/* A candidate's receipt to the left of the drawer (desktop only). The wrapper ignores pointer events so
                clicks in the gap still reach the scrim. */}
            <div
                className={cn(
                    'pointer-events-none fixed bottom-0 left-0 top-0 z-50 hidden p-4 transition-transform duration-300 ease-out lg:flex',
                    previewDoc ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ right: 'var(--drawer-w)' }}
            >
                {previewDoc && <DocumentFilePreview doc={previewDoc} onClose={() => setPreviewDocId(null)} />}
            </div>

            {/* Drawer */}
            <div
                className="fixed right-0 top-0 z-50 flex h-full flex-col"
                style={{ width: 'var(--drawer-w)', maxWidth: '94vw', background: 'var(--drawer-bg)', boxShadow: 'var(--shadow-lg)', fontFamily: FONT }}
            >
                <div className="flex flex-shrink-0 items-center justify-between border-b border-border-soft px-6 py-5">
                    <Eyebrow>{t('konten.drawer.title')}</Eyebrow>
                    <CloseButton onClick={onClose} />
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-6">
                    {/* Always mounted, so "Weiteren Beleg hochladen" can open the file picker without the dropzone. */}
                    <input {...getInputProps()} />
                    <BankCard bankTx={bankTx} />

                    {uploadingName && <ReadingCard fileName={uploadingName} />}

                    {/* Creation shortcuts, only while nothing is linked or uploading */}
                    {!ignored && !hasLinks && !reading && (
                        <>
                            <div
                                {...getRootProps()}
                                className={cn(
                                    'flex cursor-pointer select-none items-center gap-3.5 rounded-[var(--r-card)] border-2 border-dashed px-5 py-[18px] text-left transition-colors',
                                    isDragActive ? 'border-primary' : 'border-[var(--border-strong)] hover:border-primary'
                                )}
                                style={{ background: 'color-mix(in oklab, var(--accent-surface) 45%, var(--background-secondary))' }}
                            >
                                <IconTile size={44} bg="var(--accent-surface)" fg="var(--purple-700)">
                                    <Upload size={20} />
                                </IconTile>
                                <span className="min-w-0">
                                    <span className="block text-[15px] font-extrabold text-foreground">{t('konten.drawer.uploadReceipt')}</span>
                                    <span className="mt-0.5 block text-[13px] leading-[1.45] text-muted-foreground">
                                        {isDragActive ? t('konten.drawer.uploadReceiptDrop') : t('konten.drawer.uploadReceiptHint')}
                                    </span>
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreate(true)}
                                className="flex items-center gap-3.5 rounded-[var(--r-card)] border border-border-soft px-5 py-[18px] text-left transition-colors hover:border-[var(--border-strong)]"
                                style={{ background: 'var(--background-secondary)' }}
                            >
                                <IconTile size={44} bg="var(--surface-track)" fg="var(--muted-foreground)">
                                    <Plus size={20} />
                                </IconTile>
                                <span className="min-w-0">
                                    <span className="block text-[15px] font-extrabold text-foreground">{t('konten.drawer.createTransaction')}</span>
                                    <span className="mt-0.5 block text-[13px] leading-[1.45] text-muted-foreground">
                                        {t('konten.drawer.createTransactionHint')}
                                    </span>
                                </span>
                            </button>
                        </>
                    )}

                    {/* Transaktionen zuordnen */}
                    {!ignored && (
                        <div className="mt-2.5">
                            <Eyebrow icon={<Link2 size={14} />} className="mb-[11px]">
                                {t('konten.drawer.matchSection')}
                            </Eyebrow>
                            <div className="flex flex-col gap-[11px]">
                                {/* Summary: amount, linked parts, open rest, with the progress bar */}
                                <div
                                    className="rounded-[var(--r-card)] px-4 py-[13px]"
                                    style={{ background: 'var(--surface-track)', boxShadow: 'var(--shadow-lg)' }}
                                >
                                    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${summary.length}, minmax(0, 1fr))` }}>
                                        {summary.map((col) => (
                                            <div key={col.key} className="min-w-0">
                                                <div className="truncate text-[12.5px] font-semibold text-muted-foreground">{col.label}</div>
                                                <div className="mt-[3px] text-[16px] font-extrabold tabular-nums" style={{ color: col.color }}>
                                                    {format(col.value, { currency: bankTx.currency })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* One segment per linked transaction, then the preview in the next colour. */}
                                    <div
                                        className="mt-3 flex h-1.5 gap-[2px] overflow-hidden rounded-full"
                                        style={{ background: 'var(--background-secondary)' }}
                                    >
                                        {matchAllocs.map((m, i) => (
                                            <div key={m.transactionId} style={{ width: pct(m.amount ?? 0), background: segmentColor(i) }} />
                                        ))}
                                        {barPreview > EPS && (
                                            <div style={{ width: pct(barPreview), background: segmentColor(matchAllocs.length), opacity: 0.4 }} />
                                        )}
                                    </div>
                                </div>

                                {matchAllocs.map((m, i) => (
                                    <LinkedTxCard
                                        key={m.transactionId}
                                        color={segmentColor(i)}
                                        txId={m.transactionId!}
                                        used={m.amount}
                                        movementMagnitude={magnitude}
                                        currency={bankTx.currency}
                                        busy={removeMatch.isPending || updateMatchAmount.isPending}
                                        onUnlink={() => removeMatch.mutate({ bankTxId, transactionId: m.transactionId! })}
                                        onUpdateUsed={(amount) => updateMatchAmount.mutate({ bankTxId, transactionId: m.transactionId!, amount })}
                                        onReview={setReviewDoc}
                                    />
                                ))}

                                {/* Something is assigned, but a rest is still open */}
                                {hasLinks && !covered && !reading && !pickerOpen && (
                                    <div
                                        className="flex flex-col gap-2.5 rounded-[var(--r-card)] border border-border-soft px-[15px] py-[13px]"
                                        style={{ background: 'var(--background-secondary)' }}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <Info size={15} className="mt-0.5 flex-shrink-0 text-[var(--warning)]" />
                                            <span className="min-w-0 flex-1 text-[13px] leading-[1.5] text-foreground">
                                                <Trans
                                                    i18nKey="konten.drawer.restOpen"
                                                    values={{ amount: format(rest, { currency: bankTx.currency }) }}
                                                    components={{ b: <strong className="tabular-nums" /> }}
                                                />
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button type="button" onClick={openFilePicker} className={TONAL_SM}>
                                                <Upload size={15} />
                                                {t('konten.drawer.uploadMore')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowCreate(true)}
                                                className="inline-flex h-[34px] items-center gap-1.5 rounded-[var(--btn-radius)] px-3.5 text-[13px] font-bold text-foreground transition-colors hover:bg-[var(--surface-sunken)]"
                                            >
                                                <Plus size={15} />
                                                {t('konten.drawer.restWithoutReceipt')}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Link more */}
                                {!covered &&
                                    !reading &&
                                    (pickerOpen ? (
                                        <TransactionMatchPicker
                                            bankAmount={bankTx.amount ?? 0}
                                            bookingDate={bankTx.bookingDate}
                                            rest={rest}
                                            linkedIds={linkedIds}
                                            pending={addMatch.isPending}
                                            onLink={link}
                                            onPreview={setPreview}
                                            onClose={closePicker}
                                            previewDocId={previewDocId}
                                            onTogglePreview={(id) => setPreviewDocId((prev) => (prev === id ? null : id))}
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setPickerOpen(true)}
                                            className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[var(--btn-radius)] border border-border-soft bg-[var(--background-secondary)] text-[14.5px] font-bold text-foreground transition-colors hover:bg-[var(--surface-sunken)]"
                                        >
                                            <Link2 size={16} />
                                            {t('konten.drawer.linkTransaction')}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer. Links are already saved, so the primary button only closes; its label shows the result. Once the
                    movement is fully assigned only "Schließen" is left. */}
                <div className="flex flex-shrink-0 items-center gap-2.5 border-t border-border-soft px-6 py-4" style={{ background: 'var(--drawer-bg)' }}>
                    {covered ? (
                        /* Fully assigned: nothing left to assign or ignore. */
                        <>
                            <div className="flex-1" />
                            <BaseButton
                                variant="ghost"
                                className={cn(FOOTER_BTN, 'border border-border-soft text-foreground hover:bg-[var(--background-secondary)]')}
                                onClick={onClose}
                            >
                                {t('common.close')}
                            </BaseButton>
                        </>
                    ) : (
                        <>
                            {ignored ? (
                                <BaseButton
                                    variant="ghost"
                                    className={cn(FOOTER_BTN, 'text-primary')}
                                    disabled={unignoreTx.isPending}
                                    onClick={() => unignoreTx.mutate(bankTxId)}
                                >
                                    {t('konten.drawer.unignore')}
                                </BaseButton>
                            ) : (
                                <BaseButton
                                    variant="ghost"
                                    className={cn(FOOTER_BTN, 'text-muted-foreground')}
                                    disabled={ignoreTx.isPending}
                                    onClick={handleIgnore}
                                >
                                    {t('konten.drawer.ignore')}
                                </BaseButton>
                            )}
                            <div className="flex-1" />
                            {!ignored && (
                                <BaseButton variant="default" className={FOOTER_BTN} disabled={!hasLinks} onClick={onClose}>
                                    <Link2 size={16} />
                                    {hasLinks ? t('konten.drawer.assignPartial') : t('konten.drawer.assign')}
                                </BaseButton>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Create a linked transaction without a receipt, prefilled from the movement and its open rest. The drawer
                stays open and shows the new link. */}
            <CreateTransactionDrawer
                open={showCreate}
                onClose={() => setShowCreate(false)}
                bankTx={bankTx}
                prefillAmount={rest > EPS ? rest : undefined}
                stacked
                onCreated={() => setShowCreate(false)}
            />

            {/* "Beleg prüfen" on top of this drawer; closing it returns here. */}
            <ReviewDrawer doc={reviewDoc} stacked onClose={() => setReviewDoc(null)} onDeleted={() => setReviewDoc(null)} />
        </>
    );
}
