import { BankTransactionResponse, DocumentResponse, MatchAllocationResponse, TransactionResponse } from '@hopps/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Eye, FileCheck2, FileText, Info, Landmark, Link2, Loader2, Plus, Receipt, Search, Sparkles, Unlink, Upload } from 'lucide-react';
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

import { BankStatusBadge } from '@/components/BankAccounts/BankStatusBadge';
import { CreateTransactionDrawer } from '@/components/BankAccounts/CreateTransactionDrawer';
import { fmtDate } from '@/components/BankAccounts/format';
import { CandidateInfo } from '@/components/BankAccounts/MatchCandidateRow';
import { TransactionMatchPicker } from '@/components/BankAccounts/TransactionMatchPicker';
import { allocationFor, confidenceTone, defaultAllocation, fitOf, STRONG_MATCH, useMatchCandidates } from '@/components/BankAccounts/useMatchCandidates';
import { DocumentFilePreview } from '@/components/Receipts/DocumentFilePreview';
import { Eyebrow } from '@/components/Transactions/Eyebrow';
import { FONT } from '@/components/Transactions/layout';
import { MatchAllocationControl } from '@/components/Transactions/MatchAllocationControl';
import { segmentColor, segmentTint } from '@/components/Transactions/segmentColors';
import { Badge } from '@/components/Transactions/StatusBadge';
import { CloseButton } from '@/components/ui/CloseButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { HintTooltip } from '@/components/ui/HintTooltip';
import { RowAction } from '@/components/ui/RowAction';
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
import { useReopenTransaction, useTransaction } from '@/hooks/queries/useTransactions';
import { useCurrency } from '@/hooks/use-currency';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import apiService from '@/services/ApiService';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

const EPS = 0.005;

// Square icon button used on the cards (Transaktion öffnen, Verknüpfung lösen).
const ICON_BTN =
    'grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[11px] border border-border-soft bg-[var(--background-secondary)] text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground disabled:opacity-50';
const UNLINK_BTN = cn(ICON_BTN, 'hover:border-[var(--negative-border)] hover:text-[var(--negative)]');
// The buttons of a suggestion: "Verknüpfen" is the primary one, "Vorschau" stays quiet next to it.
const SUGGESTION_BTN =
    'inline-flex h-[34px] flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--btn-radius)] px-3.5 text-[13px] font-bold transition-colors';
// Neutral option of the drawer (search, upload, create). Long labels wrap instead of pushing the neighbour out.
const OPTION_BTN =
    'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[var(--btn-radius)] border border-border-soft bg-[var(--background-secondary)] px-3 py-1.5 text-center text-[13px] font-bold leading-tight text-foreground transition-colors hover:bg-[var(--surface-sunken)]';
// Footer buttons, as in the transaction drawer.
const FOOTER_BTN = 'h-[42px] gap-2 rounded-[var(--btn-radius)] px-5 text-[14.5px] font-bold';
const ACCEPT = { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] };
// A new link rises into its place, where the suggestion or picker was a moment ago.
const LINK_ENTER = 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300';
// Content that arrives a moment later (a hint with its receipt, suggestions) or comes back after an unlink.
const FADE_IN = 'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300';
const FADE_OUT = 'motion-safe:animate-out motion-safe:fade-out motion-safe:fill-mode-forwards motion-safe:duration-300';
// The drawer slides like the other drawers. They stay mounted and toggle a class; this one is mounted per movement.
const DRAWER_IN = 'motion-safe:animate-in motion-safe:slide-in-from-right-full motion-safe:duration-300 motion-safe:ease-out';
const DRAWER_OUT = 'motion-safe:animate-out motion-safe:slide-out-to-right-full motion-safe:fill-mode-forwards motion-safe:duration-300 motion-safe:ease-out';
const CLOSE_MS = 300;
// How many strong matches the drawer suggests for the open rest.
const MAX_SUGGESTIONS = 3;

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
        <div className={cn('mt-[11px] flex items-start gap-2.5 rounded-[12px] px-3 py-2.5', FADE_IN)} style={{ background: style.bg }}>
            <span className="mt-px flex-shrink-0" style={{ color: style.icon }}>
                {icon}
            </span>
            <span className={cn('min-w-0 flex-1 text-[12.5px] leading-[1.45]', style.text)}>{children}</span>
        </div>
    );
}

/**
 * Says where the values of a draft transaction created from a receipt come from, by the receipt's extraction source:
 * the AI (Document AI) or the ZUGFeRD data embedded in an e-invoice. A receipt without extracted data gets no hint, and
 * only a receipt still waiting for review shows it: once confirmed, the values have been checked.
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
    entering,
}: {
    txId: number;
    used: number | undefined;
    movementMagnitude: number;
    currency?: string;
    onUnlink: (tx: TransactionResponse) => void;
    onUpdateUsed: (amount: number) => void;
    onReview: (doc: DocumentResponse) => void;
    busy: boolean;
    /** Colour of this transaction's segment in the progress bar, repeated on the icon tile. Visual only. */
    color: string;
    /** Just linked here, so the card animates in. */
    entering: boolean;
}) {
    const { t } = useTranslation();
    const { format } = useCurrency();
    const { data: tx } = useTransaction(txId);
    const { data: doc } = useDocument(tx?.documentId ?? undefined, { poll: false });
    // Holds the card's place while the transaction loads, so what is below does not jump.
    if (!tx) {
        return (
            <FlatCard>
                <div className="h-[90px] animate-pulse rounded-[var(--r-sm)] bg-[var(--surface-track)]" />
            </FlatCard>
        );
    }

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
        <FlatCard className={entering ? LINK_ENTER : FADE_IN}>
            <div className="flex items-start gap-3">
                <IconTile bg={segmentTint(color)} fg={color}>
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
                    receiptToReview && <SourceHint doc={doc} />
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
                        small
                        amount={usedAmount}
                        max={movementMagnitude}
                        full={amount}
                        currency={currency}
                        pending={busy}
                        onSave={onUpdateUsed}
                    />
                )}
                <HintTooltip content={t('konten.drawer.unlink')}>
                    <button type="button" onClick={() => onUnlink(tx)} disabled={busy} aria-label={t('konten.drawer.unlink')} className={UNLINK_BTN}>
                        <Unlink size={15} />
                    </button>
                </HintTooltip>
                {receiptToReview ? (
                    <RowAction onClick={() => onReview(doc)}>{t('konten.drawer.review')}</RowAction>
                ) : (
                    <HintTooltip content={t('konten.drawer.openTransactionNewTab')} align="end">
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

// A suggested transaction: its head as in the picker, how well it fits the open rest, then preview and link.
function SuggestionCard({
    tx,
    score,
    disabled,
    canShowReceipt,
    showingReceipt,
    onPreview,
    onLink,
}: {
    tx: TransactionResponse;
    score: number;
    disabled: boolean;
    /** The preview shows the receipt next to the drawer; otherwise it opens the transaction in a new tab. */
    canShowReceipt: boolean;
    showingReceipt: boolean;
    onPreview: () => void;
    onLink: () => void;
}) {
    const { t } = useTranslation();

    return (
        <FlatCard className={FADE_IN}>
            <div className="flex items-center gap-3">
                <CandidateInfo tx={tx} />
            </div>
            {/* On a narrow drawer the buttons wrap below the badge and stay on the right. */}
            <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2">
                <span className="mr-auto">
                    <Badge tone={confidenceTone(score)}>
                        <Sparkles size={12} />
                        {t('konten.drawer.matchPercent', { pct: Math.round(score * 100) })}
                    </Badge>
                </span>
                <button
                    type="button"
                    onClick={onPreview}
                    aria-pressed={showingReceipt}
                    title={
                        showingReceipt
                            ? t('konten.drawer.hideReceipt')
                            : canShowReceipt
                              ? t('konten.drawer.showReceipt')
                              : t('konten.drawer.openTransactionNewTab')
                    }
                    className={cn(
                        SUGGESTION_BTN,
                        'border',
                        showingReceipt
                            ? 'border-purple-300 bg-[var(--accent-surface)] text-purple-700'
                            : 'border-border-soft text-muted-foreground hover:bg-[var(--surface-sunken)] hover:text-foreground'
                    )}
                >
                    {canShowReceipt ? <Eye size={15} /> : <ExternalLink size={15} />}
                    {t('konten.drawer.preview')}
                </button>
                <button
                    type="button"
                    onClick={onLink}
                    disabled={disabled}
                    className={cn(SUGGESTION_BTN, 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50')}
                >
                    <Link2 size={15} />
                    {t('konten.drawer.suggestionLink')}
                </button>
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
    const { showSuccess } = useToast();
    const queryClient = useQueryClient();

    const { data: bankTx } = useBankTransaction(bankTxId);
    const { data: loadedAllocs } = useBankTransactionMatches(bankTxId);

    const createReceipt = useCreateReceiptForBankTransaction();
    const addMatch = useAddBankTransactionMatch();
    const removeMatch = useRemoveBankTransactionMatch();
    const updateMatchAmount = useUpdateBankTransactionMatchAmount();
    const ignoreTx = useIgnoreBankTransaction();
    const reopenTx = useReopenTransaction();
    const unignoreTx = useMutation({
        meta: { errorMessage: 'bankMatch.toast.unignoreError' },
        mutationFn: (id: number) => apiService.orgService.ignoreDELETE(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bankTransactionKeys.all });
            showSuccess(t('bankMatch.toast.unignored'));
        },
    });

    const [pickerOpen, setPickerOpen] = useState(false);
    // A confirmed transaction whose unlinking would leave it no longer fully covered, waiting for confirmation: unlinking
    // it also reopens it (back to draft), as in the transaction drawer's Zahlungsabgleich.
    const [unlinkPending, setUnlinkPending] = useState<number | null>(null);
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
    // The transaction linked last in this drawer: only its card and progress segment animate in, not those of older links.
    const [justLinkedId, setJustLinkedId] = useState<number | null>(null);
    // The progress segment of a link just removed, shrinking away at its old place.
    const [leavingSegment, setLeavingSegment] = useState<{ index: number; amount: number; color: string } | null>(null);
    // The receipt panel only exists from this width on (see below); narrower, "Vorschau" opens the transaction instead.
    const receiptPanelFits = useMediaQuery('(min-width: 1024px)');
    // Plays the closing animation, then unmounts.
    const [closing, setClosing] = useState(false);
    const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

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

    const ignored = bankTx?.status === 'IGNORED';
    const magnitude = Math.abs(bankTx?.amount ?? 0);
    // Until the allocations arrive, the links and coverage of the list row, so the drawer opens the way it will stay.
    const matchAllocs = loadedAllocs ?? (bankTx?.matchedTransactionIds ?? []).map((transactionId) => new MatchAllocationResponse({ transactionId }));
    const linkedIds = new Set(matchAllocs.map((m) => m.transactionId!).filter((id) => id != null));
    const assigned = loadedAllocs ? loadedAllocs.reduce((s, m) => s + (m.amount ?? 0), 0) : Math.abs(bankTx?.matchedAmount ?? 0);
    const rest = Math.max(0, magnitude - assigned);
    const covered = rest <= EPS;

    // The strong matches for the open rest, offered right away and again after a partial link.
    const { candidates, settled } = useMatchCandidates({ bankAmount: bankTx?.amount ?? 0, bookingDate: bankTx?.bookingDate, rest, linkedIds });
    const suggestions = candidates.filter((c) => c.score >= STRONG_MATCH).slice(0, MAX_SUGGESTIONS);

    // A receipt can be dropped anywhere on the drawer or chosen with the upload button. The upload creates its draft
    // transaction and links it, so the drawer stays open and shows the new link.
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
        disabled: createReceipt.isPending || ignored || covered,
        noClick: true,
        noKeyboard: true,
    });

    if (!bankTx) return null;

    const reading = uploadingName != null;
    const hasLinks = matchAllocs.length > 0;
    // The first link brings its whole section with it; later ones only add a card to it.
    const firstLink = matchAllocs.length === 1 && matchAllocs[0].transactionId === justLinkedId;

    const barPreview = Math.min(rest, preview);
    const pct = (v: number) => `${magnitude > 0 ? Math.min(100, (v / magnitude) * 100) : 0}%`;
    // Without motion there is no shrinking, and so no end of it, so it is simply not shown.
    const leavingBar = leavingSegment && (
        <div
            className="motion-safe:animate-segment-out motion-reduce:hidden"
            style={{ width: pct(leavingSegment.amount), background: leavingSegment.color }}
            onAnimationEnd={() => setLeavingSegment(null)}
        />
    );

    const summary = [
        { key: 'total', label: t('konten.drawer.sumAmount'), value: magnitude, color: 'var(--foreground)' },
        {
            key: 'assigned',
            label: t('konten.drawer.sumAssigned'),
            value: assigned + preview,
            color: preview > EPS ? 'var(--purple-700)' : assigned > EPS ? 'var(--positive)' : 'var(--ink-faint)',
        },
        // Always there, also at 0,00 €, so the columns do not shift when the movement gets covered.
        {
            key: 'open',
            label: t('konten.drawer.sumOpen'),
            value: Math.max(0, rest - preview),
            color: rest - preview > EPS ? 'var(--warning)' : 'var(--ink-faint)',
        },
    ];

    // The new link replaces the suggestion or picker in one step (see useAddBankTransactionMatch).
    async function link(tx: TransactionResponse, amount: number | undefined) {
        if (tx.id == null) return;
        setJustLinkedId(tx.id);
        setPickerOpen(false);
        setPreview(0);
        try {
            await addMatch.mutateAsync({
                bankTxId,
                transactionId: tx.id,
                amount,
                optimistic: { tx, amount: amount ?? defaultAllocation(tx, bankTx!.amount ?? 0) },
            });
            showSuccess(t('bankMatch.toast.linked'));
        } catch {
            // Shown by the global mutation error handler; the mutation has taken the link back.
        }
    }

    // Unlinks straight away, unless the transaction is confirmed and would no longer be fully covered without this
    // movement's part; that asks first and then reopens it.
    function requestUnlink(tx: TransactionResponse, used: number) {
        if (tx.id == null) return;
        const coveredWithout = Math.abs(tx.coveredAmount ?? 0) - used;
        if (tx.status === 'CONFIRMED' && Math.abs(tx.total ?? 0) - coveredWithout > EPS) {
            setUnlinkPending(tx.id);
        } else {
            keepSegmentLeaving(tx.id);
            removeMatch.mutate({ bankTxId, transactionId: tx.id });
        }
    }

    // The link goes right away; its segment stays behind for a moment and shrinks.
    function keepSegmentLeaving(transactionId: number) {
        const index = matchAllocs.findIndex((m) => m.transactionId === transactionId);
        if (index >= 0) setLeavingSegment({ index, amount: matchAllocs[index].amount ?? 0, color: segmentColor(index) });
    }

    async function confirmUnlinkAndReopen() {
        if (unlinkPending == null) return;
        keepSegmentLeaving(unlinkPending);
        await removeMatch.mutateAsync({ bankTxId, transactionId: unlinkPending });
        await reopenTx.mutateAsync(unlinkPending);
        setUnlinkPending(null);
    }

    // Links a suggestion with what fits, like the picker's prefilled amount.
    function linkSuggestion(tx: TransactionResponse) {
        return link(tx, allocationFor(tx, fitOf(tx, rest), bankTx!.amount ?? 0));
    }

    // "Vorschau": the receipt next to the drawer when there is one and room for it, otherwise the transaction in a new tab.
    function previewSuggestion(tx: TransactionResponse) {
        const documentId = tx.documentId;
        if (documentId != null && receiptPanelFits) {
            setPreviewDocId((prev) => (prev === documentId ? null : documentId));
        } else {
            window.open(`/transactions?id=${tx.id}`, '_blank', 'noopener,noreferrer');
        }
    }

    function close() {
        if (closing) return;
        setClosing(true);
        setTimeout(onClose, reducedMotion ? 0 : CLOSE_MS);
    }

    function closePicker() {
        setPickerOpen(false);
        setPreview(0);
    }

    async function handleIgnore() {
        try {
            await ignoreTx.mutateAsync(bankTxId);
        } catch {
            // Shown by the global mutation error handler.
            return;
        }
        showSuccess(t('bankMatch.toast.ignored'));
        close();
    }

    return (
        <>
            {/* Scrim */}
            <div className={cn('fixed inset-0 z-40 bg-[rgba(18,17,24,0.42)] backdrop-blur-[2px]', closing ? FADE_OUT : FADE_IN)} onClick={close} />

            {/* A candidate's receipt to the left of the drawer (desktop only). The wrapper ignores pointer events so
                clicks in the gap still reach the scrim. */}
            <div
                className={cn(
                    'pointer-events-none fixed bottom-0 left-0 top-0 z-50 hidden p-4 transition-transform duration-300 ease-out lg:flex',
                    previewDoc && !closing ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ right: 'var(--drawer-w)' }}
            >
                {previewDoc && <DocumentFilePreview doc={previewDoc} onClose={() => setPreviewDocId(null)} />}
            </div>

            {/* Drawer */}
            <div
                {...getRootProps()}
                className={cn('fixed right-0 top-0 z-50 flex h-full flex-col', closing ? DRAWER_OUT : DRAWER_IN)}
                style={{ width: 'var(--drawer-w)', maxWidth: '94vw', background: 'var(--drawer-bg)', boxShadow: 'var(--shadow-lg)', fontFamily: FONT }}
            >
                {/* Shown while a file is dragged over the drawer; the drawer itself is the drop target. */}
                {isDragActive && (
                    <div
                        className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center gap-2.5 rounded-[var(--r-card)] border-2 border-dashed border-primary text-[15px] font-extrabold text-[var(--purple-700)]"
                        style={{ background: 'color-mix(in oklab, var(--accent-surface) 90%, transparent)' }}
                    >
                        <Upload size={20} />
                        {t('konten.drawer.uploadReceiptDrop')}
                    </div>
                )}

                <div className="flex flex-shrink-0 items-center justify-between border-b border-border-soft px-6 py-5">
                    <Eyebrow>{t('konten.drawer.title')}</Eyebrow>
                    <CloseButton onClick={close} />
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-6">
                    {/* Always mounted: the upload buttons and dropping on the drawer both use it. */}
                    <input {...getInputProps()} />
                    <BankCard bankTx={bankTx} />

                    {/* Summary: amount, linked parts, open rest, with the progress bar. Flat, like the summary tile of the
                        transaction drawer. */}
                    {!ignored && (
                        <div className="rounded-[var(--r-card)] px-4 py-[13px]" style={{ background: 'var(--surface-track)' }}>
                            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${summary.length}, minmax(0, 1fr))` }}>
                                {summary.map((col) => (
                                    <div key={col.key} className="min-w-0">
                                        <div className="truncate text-[12.5px] font-semibold text-muted-foreground">{col.label}</div>
                                        <div
                                            className="mt-[3px] text-[16px] font-extrabold tabular-nums transition-colors duration-300"
                                            style={{ color: col.color }}
                                        >
                                            {format(col.value, { currency: bankTx.currency })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* One segment per linked transaction, then the preview in the next colour. */}
                            <div className="mt-3 flex h-1.5 gap-[2px] overflow-hidden rounded-full" style={{ background: 'var(--background-secondary)' }}>
                                {matchAllocs.map((m, i) => (
                                    <Fragment key={m.transactionId}>
                                        {leavingSegment?.index === i && leavingBar}
                                        <div
                                            className={cn(
                                                'transition-[width,background-color] duration-300 ease-out',
                                                m.transactionId === justLinkedId && 'motion-safe:animate-segment-in'
                                            )}
                                            style={{ width: pct(m.amount ?? 0), background: segmentColor(i) }}
                                        />
                                    </Fragment>
                                ))}
                                {leavingSegment != null && leavingSegment.index >= matchAllocs.length && leavingBar}
                                {barPreview > EPS && <div style={{ width: pct(barPreview), background: segmentColor(matchAllocs.length), opacity: 0.4 }} />}
                            </div>
                        </div>
                    )}

                    {uploadingName && <ReadingCard fileName={uploadingName} />}

                    {/* What is linked so far */}
                    {!ignored && hasLinks && (
                        <div className={firstLink ? LINK_ENTER : undefined}>
                            <Eyebrow icon={<Link2 size={14} />} className="mb-[11px]">
                                {t('konten.drawer.sumAssigned')}
                            </Eyebrow>
                            <div className="flex flex-col gap-[11px]">
                                {matchAllocs.map((m, i) => (
                                    <LinkedTxCard
                                        key={m.transactionId}
                                        entering={!firstLink && m.transactionId === justLinkedId}
                                        color={segmentColor(i)}
                                        txId={m.transactionId!}
                                        used={m.amount}
                                        movementMagnitude={magnitude}
                                        currency={bankTx.currency}
                                        busy={removeMatch.isPending || updateMatchAmount.isPending}
                                        onUnlink={(tx) => requestUnlink(tx, m.amount ?? 0)}
                                        onUpdateUsed={(amount) => updateMatchAmount.mutate({ bankTxId, transactionId: m.transactionId!, amount })}
                                        onReview={setReviewDoc}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Everything that can still assign the open rest, most likely first */}
                    {!ignored && !covered && !reading && settled && (
                        <div className={cn('flex flex-col gap-[11px]', FADE_IN)}>
                            {/* Strong matches, linked with one click. Hidden while the picker is open, which lists them too. */}
                            {!pickerOpen && suggestions.length > 0 && (
                                <>
                                    <Eyebrow icon={<Sparkles size={14} />}>{t('konten.drawer.suggestionsTitle')}</Eyebrow>
                                    {suggestions.map(({ tx, score }) => (
                                        <SuggestionCard
                                            key={tx.id}
                                            tx={tx}
                                            score={score}
                                            disabled={addMatch.isPending}
                                            canShowReceipt={tx.documentId != null && receiptPanelFits}
                                            showingReceipt={tx.documentId != null && previewDocId === tx.documentId}
                                            onPreview={() => previewSuggestion(tx)}
                                            onLink={() => linkSuggestion(tx)}
                                        />
                                    ))}
                                </>
                            )}

                            {pickerOpen ? (
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
                                <button type="button" onClick={() => setPickerOpen(true)} className={cn(OPTION_BTN, 'w-full')}>
                                    <Search size={15} className="flex-shrink-0" />
                                    {suggestions.length > 0 ? t('konten.drawer.searchOther') : t('konten.drawer.searchTransaction')}
                                </button>
                            )}

                            {/* Nothing fits: upload a receipt (also by dropping it on the drawer) or record it without one */}
                            <Eyebrow className="mt-2.5">{t('konten.drawer.noMatchTitle')}</Eyebrow>
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={openFilePicker} title={t('konten.drawer.uploadReceiptHint')} className={OPTION_BTN}>
                                    <Upload size={15} className="flex-shrink-0" />
                                    {hasLinks ? t('konten.drawer.uploadMore') : t('konten.drawer.uploadReceipt')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(true)}
                                    title={t('konten.drawer.createTransactionHint')}
                                    className={OPTION_BTN}
                                >
                                    <Plus size={15} className="flex-shrink-0" />
                                    {hasLinks ? t('konten.drawer.restWithoutReceipt') : t('konten.drawer.createTransaction')}
                                </button>
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
                                onClick={close}
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
                            {!ignored && hasLinks && (
                                <BaseButton variant="default" className={FOOTER_BTN} onClick={close}>
                                    <Link2 size={16} />
                                    {t('konten.drawer.assignPartial')}
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

            <ConfirmDialog
                open={unlinkPending != null}
                onOpenChange={(o) => !o && setUnlinkPending(null)}
                title={t('transactions.detail.unlinkReopen.title')}
                description={t('transactions.detail.unlinkReopen.description')}
                confirmLabel={t('transactions.detail.unlinkReopen.confirm')}
                onConfirm={confirmUnlinkAndReopen}
                destructive
                loading={removeMatch.isPending || reopenTx.isPending}
            />

            {/* "Beleg prüfen" on top of this drawer; closing it returns here. */}
            <ReviewDrawer doc={reviewDoc} stacked onClose={() => setReviewDoc(null)} onDeleted={() => setReviewDoc(null)} />
        </>
    );
}
