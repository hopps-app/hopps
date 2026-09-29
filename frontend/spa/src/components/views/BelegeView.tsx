import { DocumentDirection, DocumentResponse, DocumentUpdateRequest, TransactionUpdateRequest } from '@hopps/api-client';
import { useQueryClient } from '@tanstack/react-query';
import {
    Upload,
    FileText,
    X,
    Trash2,
    Check,
    RefreshCw,
    ChevronDown,
    Sparkles,
    AlertCircle,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    Coins,
    ExternalLink,
    Link2,
    Landmark,
    PencilLine,
    Search,
} from 'lucide-react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import CategoryGroupFields from '@/components/CategoryGroups/CategoryGroupFields';
import { buildBommelIndex, missingRequiredGroups } from '@/components/CategoryGroups/helpers';
import { LoadingState } from '@/components/common/LoadingState';
import InvoiceUploadFormBommelSelector, { getCachedBommelId } from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector';
import { DocumentFilePreview } from '@/components/Receipts/DocumentFilePreview';
import { BankMatchSection } from '@/components/Transactions/BankMatchSection';
import { HIDE_BOMMEL_QUERY } from '@/components/Transactions/layout';
import { Badge, type BadgeTone } from '@/components/Transactions/StatusBadge';
import { BulkActionBar } from '@/components/ui/BulkActionBar';
import { CloseButton } from '@/components/ui/CloseButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, DataTableEmpty, DataTableHeader, DataTableRow, HeaderCell, RowCheckbox } from '@/components/ui/DataTable';
import { HintTooltip } from '@/components/ui/HintTooltip';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { BaseSwitch } from '@/components/ui/shadecn/BaseSwitch';
import { SortHeader } from '@/components/ui/SortHeader';
import { StatusSegments } from '@/components/ui/StatusSegments';
import { useBankTransactionsForTransaction } from '@/hooks/queries/useBankAccounts';
import { useCategoryGroups } from '@/hooks/queries/useCategoryGroups';
import {
    useDocuments,
    useDocument,
    useUploadDocument,
    useConfirmDocument,
    useUpdateDocument,
    useDeleteDocument,
    useReanalyzeDocument,
    useReanalyzeDocuments,
    getDocumentReviewStatus,
    documentKeys,
} from '@/hooks/queries/useDocuments';
import { useTransaction, useUpdateTransaction, useConfirmTransaction } from '@/hooks/queries/useTransactions';
import { useMediaQuery } from '@/hooks/use-media-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { useDocumentEvents } from '@/hooks/useDocumentEvents';
import { usePersistedState } from '@/hooks/usePersistedState';
import { getTransactionConfirmState } from '@/lib/transactionConfirm';
import { cn } from '@/lib/utils';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';
import { getDuplicateDocumentId, getErrorStatus, isNetworkError } from '@/utils/errorUtils';

const FONT = '"Hanken Grotesk", "Reddit Sans", sans-serif';

type ReceiptStatus = 'unreviewed' | 'confirmed';

const receiptStatus = (doc: DocumentResponse): ReceiptStatus => (doc.documentStatus === 'CONFIRMED' ? 'confirmed' : 'unreviewed');

// Status filter segments, same look as the transactions page.
const RECEIPT_STATUS_SEGMENTS: { id: ReceiptStatus; labelKey: string; color: string; tint: string }[] = [
    { id: 'unreviewed', labelKey: 'receipts.filter.unreviewed', color: 'var(--info)', tint: 'var(--info-surface)' },
    { id: 'confirmed', labelKey: 'receipts.filter.confirmed', color: 'var(--positive)', tint: 'var(--positive-surface)' },
];

// Shared column layout for the documents table header and rows (must stay in sync), same order as the transactions
// table. Checkbox | Beleg | Bommel | Datum | Erstellt am | Status | Betrag
const DOC_GRID = '20px minmax(0,2.3fr) 1.2fr 0.9fr 0.9fr 1.1fr 1.1fr';
// Narrow screens drop the Bommel column, like the transactions table.
const DOC_GRID_NARROW = '20px minmax(0,2.3fr) 0.9fr 0.9fr 1.1fr 1.1fr';

// Stable marker set by the backend when the AI analysis service was unreachable (mirrors
// DocumentAnalysisService.ANALYSIS_SERVICE_UNAVAILABLE). Mapped to a localized message + notification here.
const ANALYSIS_SERVICE_UNAVAILABLE = 'ANALYSIS_SERVICE_UNAVAILABLE';

// Whether a document is a candidate for (re-)analysis: analysis previously failed, or it was never analyzed
// (uploaded with analysis skipped / no status yet). Already-analyzed (COMPLETED), in-progress (PENDING /
// ANALYZING) and confirmed documents are deliberately excluded, and it must have a file to analyze.
function canReanalyzeDocument(doc: DocumentResponse): boolean {
    if (doc.documentStatus === 'CONFIRMED' || !doc.fileName) return false;
    const failed = doc.analysisStatus === 'FAILED' || doc.documentStatus === 'FAILED';
    const notAnalyzed = doc.analysisStatus === 'SKIPPED' || doc.analysisStatus == null;
    return failed || notAnalyzed;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number | null | undefined): string {
    if (amount == null) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

function fmtDate(date: Date | string | null | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fileIcon(contentType: string | undefined): string {
    if (!contentType) return '📄';
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('image')) return '🖼️';
    return '📎';
}

// The bommel field's initial value: the entity's own bommel if it has one, otherwise the cached last choice. When the
// cache is empty (explicitly cleared) or unset, the field starts empty — there is deliberately no root fallback. The
// cache thus takes priority over the empty default while still letting the user clear the field afterwards.
function initialBommelId(entityBommelId?: number | null): string {
    if (entityBommelId != null) return String(entityBommelId);
    const cached = getCachedBommelId();
    return typeof cached === 'number' ? String(cached) : '';
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

type ReviewStatus = ReturnType<typeof getDocumentReviewStatus>;

// Tone and hint per review status, in the colours of the transaction statuses: green is done, blue is open and waiting
// for the user (like Entwurf), gold asks the user to check the AI values, grey is still being processed. Failed and skipped both ask the user to fill in the
// values; the hint says why.
const REVIEW_STATUS_STYLE: Record<ReviewStatus, { tone: BadgeTone; labelKey: string; hintKey?: string }> = {
    pending: { tone: 'neutral', labelKey: 'receipts.status.pending' },
    analyzing: { tone: 'neutral', labelKey: 'receipts.status.analyzing' },
    ready: { tone: 'warn', labelKey: 'receipts.status.ready', hintKey: 'receipts.status.hint.ready' },
    confirmed: { tone: 'pos', labelKey: 'receipts.status.confirmed' },
    failed: { tone: 'info', labelKey: 'receipts.status.failed', hintKey: 'receipts.status.hint.failed' },
    skipped: { tone: 'info', labelKey: 'receipts.status.failed', hintKey: 'receipts.status.hint.skipped' },
};

function StatusBadge({ status }: { status: ReviewStatus }) {
    const { t } = useTranslation();
    const { tone, labelKey, hintKey } = REVIEW_STATUS_STYLE[status];
    return (
        <HintTooltip content={hintKey ? t(hintKey) : null}>
            <Badge tone={tone}>{t(labelKey)}</Badge>
        </HintTooltip>
    );
}

// ─── Direction Toggle ─────────────────────────────────────────────────────────

function DirectionToggle({
    value,
    onChange,
    compact = false,
    disabled = false,
}: {
    value: DocumentDirection;
    onChange: (d: DocumentDirection) => void;
    compact?: boolean;
    disabled?: boolean;
}) {
    const { t } = useTranslation();

    const options: { key: DocumentDirection; icon: typeof ArrowUpRight; bg: string; ink: string }[] = [
        { key: 'INCOMING', icon: ArrowDownRight, bg: '#F3EAFB', ink: '#7E3FB4' },
        { key: 'OUTGOING', icon: ArrowUpRight, bg: '#E7F4EC', ink: '#1F7A50' },
    ];

    return (
        <div className="grid grid-cols-2 gap-2">
            {options.map(({ key, icon: Icon, bg, ink }) => {
                const active = value === key;
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onChange(key)}
                        disabled={disabled}
                        className={cn(
                            'flex items-center gap-2.5 rounded-[10px] border transition-all text-left disabled:cursor-not-allowed',
                            compact ? 'px-3 py-2' : 'px-3 py-2.5',
                            disabled && !active && 'opacity-50'
                        )}
                        style={{
                            borderColor: active ? ink : '#E9E9EE',
                            background: active ? bg : '#FFFFFF',
                            fontFamily: FONT,
                        }}
                    >
                        <span
                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: active ? bg : '#EBEBF0', filter: active ? 'brightness(0.96)' : undefined }}
                        >
                            <Icon size={15} strokeWidth={2.4} color={active ? ink : '#9A9AA3'} />
                        </span>
                        <span className="flex flex-col min-w-0">
                            <span className="text-[13px] font-bold leading-tight truncate" style={{ color: active ? ink : '#6B6B76' }}>
                                {t(`receipts.direction.${key === 'INCOMING' ? 'incoming' : 'outgoing'}`)}
                            </span>
                            <span className="text-[11px] leading-tight" style={{ color: active ? ink : '#9A9AA3', opacity: 0.75 }}>
                                {t(`receipts.direction.${key === 'INCOMING' ? 'incomingHint' : 'outgoingHint'}`)}
                            </span>
                        </span>
                        {active && <Check size={14} strokeWidth={2.5} color={ink} className="ml-auto flex-shrink-0" />}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Form field with live AI loading indicator ──────────────────────────────────

const FIELD_LABEL_CLS = 'block text-[11px] font-bold uppercase tracking-[0.06em] text-[#9A9AA3] mb-1';
const FIELD_INPUT_CLS =
    'w-full rounded-[10px] border border-[#E9E9EE] bg-white px-3 py-2 text-[13.5px] text-[#1B1B1F] placeholder-[#9A9AA3] focus:outline-none focus:ring-2 focus:ring-[#F3EAFB] focus:border-[#9955CC] transition-colors disabled:bg-[#F8F8FA] disabled:text-[#9A9AA3] disabled:cursor-not-allowed';

function InputField({
    label,
    value,
    onChange,
    loading = false,
    disabled = false,
    type = 'text',
    inputMode,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    loading?: boolean;
    disabled?: boolean;
    type?: string;
    inputMode?: 'decimal' | 'text';
    placeholder?: string;
}) {
    return (
        <div>
            <label className={FIELD_LABEL_CLS}>{label}</label>
            <div className="relative">
                <input
                    type={type}
                    inputMode={inputMode}
                    value={value}
                    placeholder={loading ? '' : placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={cn(FIELD_INPUT_CLS, loading && 'pr-9')}
                />
                {loading && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9955CC] pointer-events-none">
                        <Loader2 size={15} className="animate-spin" />
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Receipt data row (bank-reconcile "Beleg" tab) ──────────────────────────────

/**
 * One read-only row of AI-extracted receipt data with an optional "apply" action that copies the value into the
 * editable transaction form. Used in the "Beleg" tab so the user can compare the analysed receipt against the
 * transaction and pull values over field by field.
 */
function ReceiptDataRow({
    label,
    value,
    canApply,
    onApply,
    applyLabel,
}: {
    label: string;
    value: string | null;
    canApply: boolean;
    onApply: () => void;
    applyLabel: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[10px] border border-[#E9E9EE]" style={{ background: '#FFFFFF' }}>
            <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#9A9AA3]">{label}</div>
                <div className="text-[13.5px] text-[#1B1B1F] truncate">{value || '—'}</div>
            </div>
            {value && canApply && (
                <button type="button" onClick={onApply} className="text-[12px] font-bold text-[#7E3FB4] hover:underline whitespace-nowrap flex-shrink-0">
                    {applyLabel}
                </button>
            )}
        </div>
    );
}

// ─── Review Drawer ────────────────────────────────────────────────────────────

// Exported so the Konten (bank accounts) page can reuse the exact same receipt-review / transaction-reconcile flow:
// after uploading a receipt onto a bank transaction there, the user stays on the Konten page and completes + confirms
// the transaction in this drawer instead of being navigated to the receipts page. The component is self-contained
// (driven only by the `doc` prop and the callbacks), so reusing it needs no view-level state from BelegeView.
export function ReviewDrawer({ doc: docProp, onClose, onDeleted }: { doc: DocumentResponse | null; onClose: () => void; onDeleted: () => void }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const confirmMutation = useConfirmDocument();
    const updateMutation = useUpdateDocument();
    const deleteMutation = useDeleteDocument();
    const reanalyzeMutation = useReanalyzeDocument();
    const updateTransaction = useUpdateTransaction();
    const confirmTransaction = useConfirmTransaction();

    // Live document — polls every 2s while the AI analysis is still running so results appear automatically
    const { data: liveDoc } = useDocument(docProp?.id);
    const doc = liveDoc ?? docProp;

    // When the receipt has a linked transaction (created from a bank transaction, or after confirming), the detail view
    // shows the transaction data (primary) and the analysed receipt data in a second tab. `hasLinkedTransaction` drives
    // the display; `isBankReconcile` (only while not yet confirmed) additionally allows editing/applying onto the
    // transaction.
    // Read the transaction link from the *live* document, so a transaction created while the drawer stays open (via
    // "Als Transaktion bestätigen") is picked up immediately and the drawer switches into reconcile mode.
    const linkedTransactionId = doc?.transactionId ?? undefined;
    const hasLinkedTransaction = linkedTransactionId != null;
    // Bank-origin receipts (created from a Kontoumsatz) already carry a linked transaction while the document is not
    // yet confirmed — used only to show the "Aus Kontoumsatz erstellt" hint.
    const isBankReconcile = hasLinkedTransaction && docProp?.documentStatus !== 'CONFIRMED';
    const { data: linkedTx } = useTransaction(linkedTransactionId ?? 0);
    // The bank transaction(s) the linked transaction is matched to — shown for cross-checking the auto-filled values
    // and used to decide whether the amount is fully covered (a prerequisite for confirming).
    const { data: linkedBankTxns = [] } = useBankTransactionsForTransaction(linkedTransactionId);

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [senderName, setSenderName] = useState('');
    const [bommelId, setBommelId] = useState('');
    const [privatelyPaid, setPrivatelyPaid] = useState(false);
    const [categoryValues, setCategoryValues] = useState<Record<number, string>>({});
    const [direction, setDirection] = useState<DocumentDirection>('INCOMING');
    const { data: categoryGroups = [] } = useCategoryGroups();
    const reviewAllBommels = useBommelsStore((s) => s.allBommels);
    const { showError: showCategoryError } = useToast();
    // In bank-reconcile mode the detail view is split into the transaction data (primary) and the analysed receipt data.
    const [detailTab, setDetailTab] = useState<'transaction' | 'receipt'>('transaction');
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    useEffect(() => {
        setDetailTab('transaction');
    }, [docProp?.id]);

    const open = docProp !== null;
    const analysisStatus = doc?.analysisStatus;
    const isAnalyzing = analysisStatus === 'PENDING' || analysisStatus === 'ANALYZING';
    const status = doc ? getDocumentReviewStatus(doc) : 'pending';
    // The transaction lifecycle — not the document status — now drives editability: while the linked transaction is a
    // draft the receipt stays fully editable (fill values, match bank transactions). A receipt is "finalized"
    // (read-only) only once its transaction has been confirmed.
    const txConfirmed = linkedTx?.status === 'CONFIRMED';
    const isReconcile = hasLinkedTransaction && !txConfirmed;
    const isFinalized = txConfirmed;
    const serviceUnavailable = doc?.analysisError === ANALYSIS_SERVICE_UNAVAILABLE;

    // Initialize the form once per opened document (uses the list snapshot, which already holds
    // any previously extracted data for already-analyzed receipts).
    const initializedIdRef = useRef<number | null>(null);
    useEffect(() => {
        if (!docProp) {
            initializedIdRef.current = null;
            return;
        }
        if (initializedIdRef.current === docProp.id) return;

        if (hasLinkedTransaction) {
            // Seed the form from the linked transaction; wait until it has loaded.
            if (!linkedTx) return;
            initializedIdRef.current = docProp.id ?? null;
            setName(linkedTx.name ?? '');
            setAmount(linkedTx.total != null ? String(Math.abs(Number(linkedTx.total))) : '');
            setDate(linkedTx.transactionTime ? new Date(linkedTx.transactionTime).toISOString().slice(0, 10) : '');
            setSenderName(linkedTx.senderName ?? '');
            // Use the transaction's own bommel once it has one (e.g. a value already saved on the draft); a freshly
            // created draft carries no bommel (the backend no longer seeds the bank account's root bommel), so this
            // falls back to the shared "last used" bommel cache — the same one the transaction forms use.
            setBommelId(initialBommelId(linkedTx.bommelId));
            setPrivatelyPaid(linkedTx.privatelyPaid ?? false);
            setDirection(Number(linkedTx.total ?? 0) < 0 ? 'INCOMING' : 'OUTGOING');
            const cv: Record<number, string> = {};
            (linkedTx.categoryValues ?? []).forEach((c) => {
                if (c.groupId != null && c.value != null) {
                    cv[c.groupId] = c.value;
                }
            });
            setCategoryValues(cv);
            return;
        }

        initializedIdRef.current = docProp.id ?? null;
        setName(docProp.name ?? '');
        setAmount(docProp.total != null ? String(Math.abs(Number(docProp.total))) : '');
        setDate(docProp.transactionTime ? new Date(docProp.transactionTime).toISOString().slice(0, 10) : '');
        setSenderName(docProp.senderName ?? '');
        setBommelId(initialBommelId(docProp.bommelId));
        setPrivatelyPaid(docProp.privatelyPaid ?? false);
        setDirection(docProp.direction ?? 'INCOMING');
    }, [docProp, hasLinkedTransaction, linkedTx]);

    // As the AI analysis streams in via polling, fill ONLY the fields the user has left empty. Manually entered values
    // are preserved (prev || value). Skipped when a linked transaction exists — there the form shows the transaction
    // data and the AI values live in the separate "Beleg" tab.
    useEffect(() => {
        if (hasLinkedTransaction) return;
        if (!liveDoc || liveDoc.id !== initializedIdRef.current) return;
        if (liveDoc.name) setName((p) => p || liveDoc.name!);
        if (liveDoc.total != null) setAmount((p) => p || String(Math.abs(Number(liveDoc.total))));
        if (liveDoc.transactionTime) setDate((p) => p || new Date(liveDoc.transactionTime!).toISOString().slice(0, 10));
        if (liveDoc.senderName) setSenderName((p) => p || liveDoc.senderName!);
        if (liveDoc.bommelId != null) setBommelId((p) => p || String(liveDoc.bommelId));
    }, [liveDoc, hasLinkedTransaction]);

    // Refresh the list once analysis finishes so the row's status/amount update too.
    const prevAnalyzingRef = useRef(false);
    useEffect(() => {
        if (prevAnalyzingRef.current && !isAnalyzing) {
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
        }
        prevAnalyzingRef.current = isAnalyzing;
    }, [isAnalyzing, queryClient]);

    // AI-extracted values from the analysed document, shown in the "Beleg" tab of the reconcile view.
    const aiName = liveDoc?.name ?? undefined;
    const aiAmount = liveDoc?.total != null ? String(Math.abs(Number(liveDoc.total))) : undefined;
    const aiDate = liveDoc?.transactionTime ? new Date(liveDoc.transactionTime).toISOString().slice(0, 10) : undefined;
    const aiSender = liveDoc?.senderName ?? undefined;
    const aiRecipient = liveDoc?.recipientName || undefined;
    // The extracted party matching the current direction: expense (INCOMING) → the merchant/sender,
    // income (OUTGOING) → the customer/recipient. This is what the counterparty field is filled with.
    const aiCounterparty = direction === 'OUTGOING' ? aiRecipient : aiSender;
    // Whether the document analysis actually produced any usable data.
    const receiptHasData = !!(aiName || aiAmount || aiDate || aiSender || aiRecipient);

    // For income ("Einnahme" = OUTGOING direction) the counterparty is the recipient, so the sender field
    // is labelled "Empfänger"; for an expense it stays "Aussteller".
    const senderLabel = direction === 'OUTGOING' ? t('receipts.review.recipient') : t('receipts.review.sender');

    // Switching direction fills the counterparty field from the party the analysis extracted for that direction
    // (expense → merchant, income → customer). Only overwrites when an extracted value exists, so a value the
    // user typed manually isn't wiped.
    function handleDirectionChange(next: DocumentDirection) {
        setDirection(next);
        const extracted = next === 'OUTGOING' ? aiRecipient : aiSender;
        if (extracted) setSenderName(extracted);
    }

    function buildPayload() {
        const rawAmount = parseFloat(amount.replace(',', '.'));
        return new DocumentUpdateRequest({
            name: name || undefined,
            total: !isNaN(rawAmount) ? rawAmount : undefined,
            transactionDate: date || undefined,
            senderName: senderName || undefined,
            // Send 0 (not undefined) when the field is empty so a removed bommel is actually cleared server-side —
            // undefined would be treated as "unchanged" and keep the previous bommel.
            bommelId: bommelId ? Number(bommelId) : 0,
            privatelyPaid,
            direction,
        });
    }

    // In reconcile mode the chosen values are written onto the EXISTING transaction (signed by direction).
    function buildTransactionPayload() {
        const rawAmount = parseFloat(amount.replace(',', '.'));
        const signed = isNaN(rawAmount) ? undefined : direction === 'OUTGOING' ? Math.abs(rawAmount) : -Math.abs(rawAmount);
        return new TransactionUpdateRequest({
            name: name || undefined,
            total: signed,
            transactionDate: date || undefined,
            senderName: senderName || undefined,
            // Send 0 (not undefined) when the field is empty so a removed bommel is actually cleared server-side —
            // undefined would be treated as "unchanged" and keep the previous bommel.
            bommelId: bommelId ? Number(bommelId) : 0,
            privatelyPaid,
            categoryValues,
        });
    }

    // Fresh receipt (no transaction yet): persist the edited values, then create the DRAFT transaction and keep the
    // drawer open. The live document refetches with the new transactionId, so the receipt switches into reconcile
    // mode where the remaining values and bank matches can be added right here — no detour via the transactions tab.
    async function handleCreateTransaction() {
        if (!doc?.id) return;
        // Attach the id onto the DocumentUpdateRequest instance (rather than spreading it into a plain object, which
        // would drop the class shape the mutation expects).
        await updateMutation.mutateAsync(Object.assign(buildPayload(), { id: doc.id }));
        await confirmMutation.mutateAsync(doc.id);
        // No onClose: liveDoc now carries the transactionId and the drawer re-renders in reconcile mode.
    }

    // Save the current values. Once a transaction is linked the values are written onto it (kept as a DRAFT so
    // incomplete transactions can always be saved); otherwise the document itself is updated.
    async function handleSave() {
        if (!doc?.id) return;
        if (isReconcile && linkedTransactionId) {
            await updateTransaction.mutateAsync({ id: linkedTransactionId, data: buildTransactionPayload() });
        } else {
            // Attach the id onto the DocumentUpdateRequest instance (rather than spreading it into a plain object,
            // which would drop the class shape the mutation expects).
            await updateMutation.mutateAsync(Object.assign(buildPayload(), { id: doc.id }));
        }
        onClose();
    }

    // Finalize: write the reconciled values onto the transaction and confirm it (DRAFT → CONFIRMED). Only reachable
    // when confirmState.canConfirm, so the backend confirm guard always passes.
    async function handleFinalize() {
        if (!doc?.id || !linkedTransactionId) return;
        const missing = missingRequiredGroups(categoryGroups, bommelId ? Number(bommelId) : null, buildBommelIndex(reviewAllBommels), categoryValues);
        if (missing.length > 0) {
            showCategoryError(t('categoryGroups.fields.missing', { groups: missing.map((g) => g.name).join(', ') }));
            return;
        }
        await updateTransaction.mutateAsync({ id: linkedTransactionId, data: buildTransactionPayload() });
        await confirmTransaction.mutateAsync(linkedTransactionId);
        onClose();
    }

    async function handleDelete() {
        if (!doc?.id) return;
        await deleteMutation.mutateAsync(doc.id);
        setConfirmDeleteOpen(false);
        onDeleted();
        onClose();
    }

    const busy = updateMutation.isPending || confirmMutation.isPending || updateTransaction.isPending || confirmTransaction.isPending;
    const fieldsDisabled = isFinalized || busy;

    // Whether the linked draft transaction may be confirmed here — same rule as the transaction drawer: amount, date,
    // counterparty and description set AND the amount exactly covered by the linked bank transactions.
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    const confirmState = getTransactionConfirmState(
        {
            // Signed by direction (INCOMING invoice = expense −, OUTGOING = income +) so a directional mismatch with the
            // linked bank movement blocks confirm.
            amount: isNaN(parsedAmount) ? null : direction === 'INCOMING' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
            date: date || null,
            counterparty: senderName || null,
            name: name || null,
            bommelId: bommelId ? Number(bommelId) : null,
        },
        linkedBankTxns
    );

    // Required category groups applicable to the selected bommel that still have no value also block confirming here.
    const missingConfirmGroups = missingRequiredGroups(categoryGroups, bommelId ? Number(bommelId) : null, buildBommelIndex(reviewAllBommels), categoryValues);
    const canConfirm = confirmState.canConfirm && missingConfirmGroups.length === 0;

    return (
        <>
            <div
                className={cn('fixed inset-0 bg-black/25 z-40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
                onClick={onClose}
            />
            {/* Large file preview to the left of the detail drawer (desktop only). pointer-events-none on the wrapper so
                clicks on the surrounding area fall through to the scrim and close the drawer. */}
            <div
                className={cn(
                    'hidden lg:flex fixed top-0 bottom-0 left-0 z-50 p-4 pointer-events-none transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ right: 460, fontFamily: FONT }}
            >
                {doc && <DocumentFilePreview doc={doc} />}
            </div>
            <div
                className={cn(
                    'fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : 'translate-x-full'
                )}
                style={{ width: 460, maxWidth: '100vw', background: 'var(--drawer-bg)', boxShadow: 'var(--shadow-lg)', fontFamily: FONT }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#E9E9EE]">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#7E3FB4]">{t('receipts.review.title')}</span>
                        {doc && <p className="mt-0.5 text-[13px] text-[#6B6B76] truncate max-w-[300px]">{doc.fileName}</p>}
                    </div>
                    <CloseButton onClick={onClose} />
                </div>

                {!doc ? (
                    <div className="flex-1 flex items-center justify-center">
                        <LoadingState />
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto">
                            {/* Status bar — the analyzing/ready/failed states are explained by the banner below, so the
                                short description is only shown for the states without a banner (pending, confirmed). */}
                            <div className="px-6 py-3 border-b border-[#E9E9EE] flex flex-col gap-1.5" style={{ background: '#FFFFFF' }}>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={status} />
                                </div>
                                {(status === 'confirmed' || status === 'pending') && (
                                    <p className="text-[12px] text-[#6B6B76] leading-snug">{t(`receipts.statusDescription.${status}`)}</p>
                                )}
                            </div>

                            {/* File preview card */}
                            <div className="px-6 pt-5 pb-4">
                                <div className="flex items-center gap-3 p-4 rounded-[14px] border border-[#E9E9EE]" style={{ background: '#FFFFFF' }}>
                                    <div
                                        className="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0 text-xl"
                                        style={{ background: '#F3EAFB' }}
                                    >
                                        {fileIcon(doc.fileContentType)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13.5px] font-bold text-[#1B1B1F] truncate">{doc.fileName}</p>
                                        <p className="text-[12px] text-[#9A9AA3]">
                                            {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : '—'}
                                            {doc.uploadedBy ? ` · ${doc.uploadedBy}` : ''}
                                            {doc.createdAt ? ` · ${fmtDate(doc.createdAt)}` : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* AI analysis banner */}
                            {!isFinalized && (isAnalyzing || status === 'ready' || status === 'failed') && (
                                <div className="px-6 pt-1">
                                    {isAnalyzing && (
                                        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-[12px]" style={{ background: '#EDF4FF' }}>
                                            <Loader2 size={16} className="text-[#2563EB] flex-shrink-0 mt-0.5 animate-spin" />
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-[#2563EB]">{t('receipts.review.analyzing')}</p>
                                                <p className="text-[12px] text-[#2563EB] opacity-80 leading-snug">{t('receipts.review.analyzingHint')}</p>
                                            </div>
                                        </div>
                                    )}
                                    {status === 'ready' && (
                                        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-[12px]" style={{ background: '#F3EAFB' }}>
                                            <Sparkles size={16} className="text-[#7E3FB4] flex-shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-[#7E3FB4]">
                                                    {t('receipts.review.completed')}
                                                    {doc.extractionSource && <span className="ml-1 font-normal opacity-70">({doc.extractionSource})</span>}
                                                </p>
                                                <p className="text-[12px] text-[#7E3FB4] opacity-80 leading-snug">{t('receipts.review.completedHint')}</p>
                                            </div>
                                        </div>
                                    )}
                                    {status === 'failed' && (
                                        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-[12px]" style={{ background: '#F3EAFB' }}>
                                            <PencilLine size={16} className="text-[#7E3FB4] flex-shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-[#7E3FB4]">
                                                    {serviceUnavailable ? t('receipts.review.serviceUnavailableTitle') : t('receipts.review.failedTitle')}
                                                </p>
                                                <p className="text-[12px] text-[#7E3FB4] opacity-80 leading-snug">
                                                    {serviceUnavailable
                                                        ? t('receipts.review.serviceUnavailableHint')
                                                        : doc.analysisError || t('receipts.review.failedHint')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Bank reconcile hint */}
                            {isBankReconcile && (
                                <div className="px-6 pt-1">
                                    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-[12px]" style={{ background: '#E7F4EC' }}>
                                        <Link2 size={16} className="text-[#1F7A50] flex-shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-[#1F7A50]">{t('receipts.review.bankReconcileTitle')}</p>
                                            <p className="text-[12px] text-[#1F7A50] opacity-80 leading-snug">{t('receipts.review.bankReconcileHint')}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Link to the created transaction (only once the transaction is confirmed/finalized) */}
                            {isFinalized && doc.transactionId && (
                                <div className="px-6 pt-1">
                                    <button
                                        onClick={() => navigate(`/transactions?id=${doc.transactionId}`)}
                                        className="w-full flex items-center gap-3 p-3 rounded-[12px] border border-[#E9E9EE] text-left transition-colors hover:border-[#C7A2E3] hover:bg-[#F3EAFB]"
                                        style={{ background: '#FFFFFF' }}
                                    >
                                        <span
                                            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                                            style={{ background: '#E7F4EC' }}
                                        >
                                            <Coins size={16} className="text-[#1F7A50]" />
                                        </span>
                                        <span className="flex flex-col min-w-0">
                                            <span className="text-[13px] font-bold text-[#1B1B1F] truncate">
                                                {t('receipts.review.linkedTransaction')} #{doc.transactionId}
                                            </span>
                                            <span className="text-[12px] text-[#6B6B76]">{t('receipts.review.openTransaction')}</span>
                                        </span>
                                        <ExternalLink size={15} className="text-[#7E3FB4] ml-auto flex-shrink-0" />
                                    </button>
                                </div>
                            )}

                            {/* Linked bank transaction(s) — reference to cross-check the auto-filled values. */}
                            {hasLinkedTransaction && linkedBankTxns.length > 0 && (
                                <div className="px-6 pt-2 space-y-2">
                                    {linkedBankTxns.map((b) => (
                                        <div key={b.id} className="rounded-[12px] border border-[#E9E9EE] p-3.5" style={{ background: '#FFFFFF' }}>
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <Landmark size={14} className="text-[#1F7A50] flex-shrink-0" />
                                                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#9A9AA3]">
                                                    {t('receipts.review.linkedBankTx')}
                                                </span>
                                                {b.bankAccountName && (
                                                    <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-[#6B6B76]">
                                                        <span className="w-2 h-2 rounded-full" style={{ background: b.bankAccountColor || '#9955CC' }} />
                                                        {b.bankAccountName}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#9A9AA3]">
                                                        {t('receipts.review.counterparty')}
                                                    </div>
                                                    <div className="text-[13px] text-[#1B1B1F] truncate">{b.counterpartyName || '—'}</div>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#9A9AA3]">
                                                        {t('receipts.review.amount')}
                                                    </div>
                                                    <div
                                                        className="text-[13px] font-bold tabular-nums"
                                                        style={{ color: (b.amount ?? 0) >= 0 ? '#1F7A50' : '#B12C4C' }}
                                                    >
                                                        {fmtCurrency(b.amount)}
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#9A9AA3]">
                                                        {t('receipts.review.date')}
                                                    </div>
                                                    <div className="text-[13px] text-[#1B1B1F] tabular-nums">{fmtDate(b.bookingDate)}</div>
                                                </div>
                                                <div className="col-span-2 min-w-0">
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#9A9AA3]">
                                                        {t('receipts.review.purpose')}
                                                    </div>
                                                    <div className="text-[13px] text-[#1B1B1F] leading-snug break-words">{b.purpose || '—'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tab toggle — only when a linked transaction exists. */}
                            {hasLinkedTransaction && (
                                <div className="px-6 pt-4">
                                    <div className="flex rounded-xl p-0.5 gap-0.5" style={{ background: '#F1F1F4' }}>
                                        {(['transaction', 'receipt'] as const).map((tabKey) => (
                                            <button
                                                key={tabKey}
                                                type="button"
                                                onClick={() => setDetailTab(tabKey)}
                                                className={cn(
                                                    'flex-1 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors',
                                                    detailTab === tabKey ? 'bg-white shadow-sm text-[#1B1B1F]' : 'text-[#6B6B76] hover:text-[#1B1B1F]'
                                                )}
                                            >
                                                {t(tabKey === 'transaction' ? 'receipts.review.tabTransaction' : 'receipts.review.tabReceipt')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Transaction data — the editable form (primary). */}
                            {(!hasLinkedTransaction || detailTab === 'transaction') && (
                                <div className="px-6 py-5 space-y-3">
                                    <div>
                                        <label className={FIELD_LABEL_CLS}>{t('receipts.direction.label')}</label>
                                        <DirectionToggle value={direction} onChange={handleDirectionChange} compact disabled={fieldsDisabled} />
                                    </div>
                                    <InputField
                                        label={t('receipts.review.name')}
                                        value={name}
                                        onChange={setName}
                                        loading={isAnalyzing && !name}
                                        disabled={fieldsDisabled}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField
                                            label={`${t('receipts.review.amount')} (€)`}
                                            value={amount}
                                            onChange={setAmount}
                                            type="text"
                                            inputMode="decimal"
                                            loading={isAnalyzing && !amount}
                                            disabled={fieldsDisabled}
                                        />
                                        <InputField
                                            label={t('receipts.review.date')}
                                            value={date}
                                            onChange={setDate}
                                            type="date"
                                            loading={isAnalyzing && !date}
                                            disabled={fieldsDisabled}
                                        />
                                    </div>
                                    <InputField
                                        label={senderLabel}
                                        value={senderName}
                                        onChange={setSenderName}
                                        loading={isAnalyzing && !senderName}
                                        disabled={fieldsDisabled}
                                    />
                                    <div>
                                        <label className={FIELD_LABEL_CLS}>{t('receipts.review.bommel')}</label>
                                        <InvoiceUploadFormBommelSelector
                                            value={bommelId ? Number(bommelId) : null}
                                            onChange={(id) => setBommelId(id ? String(id) : '')}
                                            disabled={fieldsDisabled}
                                        />
                                    </div>
                                    {!fieldsDisabled && (
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
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setPrivatelyPaid((v) => !v)}
                                        disabled={fieldsDisabled}
                                        className="w-full flex items-center gap-3 p-3 rounded-[10px] border transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                        style={{
                                            borderColor: privatelyPaid ? '#9955CC' : '#E9E9EE',
                                            background: privatelyPaid ? '#F3EAFB' : '#FFFFFF',
                                        }}
                                    >
                                        <span
                                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{ background: privatelyPaid ? '#E0C8F5' : '#EBEBF0' }}
                                        >
                                            {privatelyPaid ? (
                                                <Check size={14} strokeWidth={2.5} color="#7E3FB4" />
                                            ) : (
                                                <span className="w-3.5 h-3.5 rounded border-2 border-[#C0C0CC]" />
                                            )}
                                        </span>
                                        <span className="text-[13.5px] font-semibold" style={{ color: privatelyPaid ? '#7E3FB4' : '#1B1B1F' }}>
                                            {t('receipts.review.privatelyPaid')}
                                        </span>
                                    </button>
                                </div>
                            )}

                            {/* Bank reconciliation — assign the bank transaction directly here, without opening the
                                transaction screen. Only available once a linked transaction exists. */}
                            {hasLinkedTransaction && detailTab === 'transaction' && linkedTx && (
                                <div className="border-t border-[#E9E9EE]">
                                    <BankMatchSection tx={linkedTx} />
                                </div>
                            )}

                            {/* Analysed receipt data (read-only) with per-field "apply to transaction". */}
                            {hasLinkedTransaction && detailTab === 'receipt' && (
                                <div className="px-6 py-5">
                                    {isAnalyzing && !receiptHasData ? (
                                        <div className="flex flex-col items-center justify-center gap-2 py-8 text-[#6B6B76]">
                                            <Loader2 size={22} className="animate-spin text-[#7E3FB4]" />
                                            <span className="text-[13px]">{t('receipts.review.analyzing')}</span>
                                        </div>
                                    ) : receiptHasData ? (
                                        <div className="space-y-2.5">
                                            <ReceiptDataRow
                                                label={t('receipts.review.name')}
                                                value={aiName ?? null}
                                                canApply={!fieldsDisabled && !!aiName && aiName !== name}
                                                onApply={() => setName(aiName!)}
                                                applyLabel={t('receipts.review.applySuggestion')}
                                            />
                                            <ReceiptDataRow
                                                label={`${t('receipts.review.amount')} (€)`}
                                                value={aiAmount ? fmtCurrency(Number(aiAmount)) : null}
                                                canApply={!fieldsDisabled && !!aiAmount && aiAmount !== amount}
                                                onApply={() => setAmount(aiAmount!)}
                                                applyLabel={t('receipts.review.applySuggestion')}
                                            />
                                            <ReceiptDataRow
                                                label={t('receipts.review.date')}
                                                value={aiDate ? fmtDate(aiDate) : null}
                                                canApply={!fieldsDisabled && !!aiDate && aiDate !== date}
                                                onApply={() => setDate(aiDate!)}
                                                applyLabel={t('receipts.review.applySuggestion')}
                                            />
                                            <ReceiptDataRow
                                                label={senderLabel}
                                                value={aiCounterparty ?? null}
                                                canApply={!fieldsDisabled && !!aiCounterparty && aiCounterparty !== senderName}
                                                onApply={() => setSenderName(aiCounterparty!)}
                                                applyLabel={t('receipts.review.applySuggestion')}
                                            />
                                            {doc.extractionSource && (
                                                <p className="text-[11px] text-[#9A9AA3] pt-1">
                                                    {t('receipts.review.extractedBy', { source: doc.extractionSource })}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#F1F1F4' }}>
                                                <FileText size={22} className="text-[#9A9AA3]" />
                                            </div>
                                            <p className="text-[14px] font-semibold text-[#1B1B1F]">{t('receipts.review.noReceiptDataTitle')}</p>
                                            <p className="text-[13px] text-[#6B6B76] max-w-xs">{t('receipts.review.noReceiptDataHint')}</p>
                                            {(status === 'failed' || status === 'ready' || status === 'skipped') && (
                                                <button
                                                    type="button"
                                                    onClick={() => doc.id && reanalyzeMutation.mutate(doc.id)}
                                                    disabled={reanalyzeMutation.isPending}
                                                    className="mt-1 flex items-center gap-1.5 py-2 px-4 rounded-full text-[13px] font-bold border border-[#E0E0E6] text-[#6B6B76] hover:bg-white transition-colors disabled:opacity-50"
                                                >
                                                    <RefreshCw size={13} className={reanalyzeMutation.isPending ? 'animate-spin' : ''} />
                                                    {t('receipts.review.reanalyze')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-[#E9E9EE] flex flex-col gap-2" style={{ background: 'var(--drawer-bg)' }}>
                            {isFinalized ? (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[13px] text-[#6B6B76]">{t('receipts.review.alreadyConfirmed')}</span>
                                    <button
                                        onClick={() => setConfirmDeleteOpen(true)}
                                        disabled={deleteMutation.isPending}
                                        className="rounded-[var(--btn-radius)] px-4 py-2 text-[13.5px] font-bold text-[var(--negative)] transition-colors hover:bg-[var(--negative-surface)] disabled:opacity-50"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ) : isReconcile ? (
                                /* Draft transaction linked: finalize (only when complete + covered) or keep as a draft. */
                                <>
                                    <HintTooltip
                                        className="w-full"
                                        content={
                                            canConfirm ? null : (
                                                <>
                                                    <span className="font-bold">{t('transactions.confirmBlockers.title')}</span>
                                                    <span className="block mt-0.5">
                                                        {[
                                                            ...confirmState.missing.map((m) => t(`transactions.confirmBlockers.${m}`)),
                                                            ...missingConfirmGroups.map((g) => g.name),
                                                        ].join(', ')}
                                                    </span>
                                                </>
                                            )
                                        }
                                    >
                                        <BaseButton
                                            variant="default"
                                            onClick={handleFinalize}
                                            disabled={busy || !canConfirm}
                                            className="h-auto w-full gap-2 rounded-[var(--btn-radius)] py-3 text-[14.5px] font-bold"
                                        >
                                            <Check size={16} strokeWidth={2.5} />
                                            {confirmTransaction.isPending ? '…' : t('receipts.review.finalize')}
                                        </BaseButton>
                                    </HintTooltip>
                                    <div className="flex gap-2">
                                        <BaseButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleSave}
                                            disabled={busy}
                                            className="flex-1 gap-1.5 rounded-[var(--btn-radius)] border border-border-soft text-[13.5px] font-bold text-muted-foreground hover:bg-[var(--surface-sunken)]"
                                        >
                                            {updateTransaction.isPending && !confirmTransaction.isPending ? '…' : t('receipts.review.saveDraft')}
                                        </BaseButton>
                                        <button
                                            onClick={handleDelete}
                                            disabled={deleteMutation.isPending}
                                            className="rounded-[var(--btn-radius)] px-4 py-2 text-[13.5px] font-bold text-[var(--negative)] transition-colors hover:bg-[var(--negative-surface)] disabled:opacity-50"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                /* Fresh receipt without a transaction yet: create the draft transaction (stays open) or save the receipt. */
                                <>
                                    <BaseButton
                                        variant="default"
                                        onClick={handleCreateTransaction}
                                        disabled={busy}
                                        className="h-auto w-full gap-2 rounded-[var(--btn-radius)] py-3 text-[14.5px] font-bold"
                                    >
                                        <Check size={16} strokeWidth={2.5} />
                                        {confirmMutation.isPending ? '…' : t('receipts.review.createTransaction')}
                                    </BaseButton>
                                    <div className="flex gap-2">
                                        <BaseButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleSave}
                                            disabled={busy}
                                            className="flex-1 gap-1.5 rounded-[var(--btn-radius)] border border-border-soft text-[13.5px] font-bold text-muted-foreground hover:bg-[var(--surface-sunken)]"
                                        >
                                            {updateMutation.isPending && !confirmMutation.isPending ? '…' : t('receipts.review.save')}
                                        </BaseButton>
                                        {(status === 'failed' || status === 'ready' || status === 'skipped') && (
                                            <BaseButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => doc.id && reanalyzeMutation.mutate(doc.id)}
                                                disabled={reanalyzeMutation.isPending}
                                                className="flex-1 gap-1.5 rounded-[var(--btn-radius)] border border-border-soft text-[13.5px] font-bold text-muted-foreground hover:bg-[var(--surface-sunken)]"
                                            >
                                                <RefreshCw size={13} className={reanalyzeMutation.isPending ? 'animate-spin' : ''} />
                                                {t('receipts.review.reanalyze')}
                                            </BaseButton>
                                        )}
                                        <button
                                            onClick={handleDelete}
                                            disabled={deleteMutation.isPending}
                                            className="rounded-[var(--btn-radius)] px-4 py-2 text-[13.5px] font-bold text-[var(--negative)] transition-colors hover:bg-[var(--negative-surface)] disabled:opacity-50"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            <ConfirmDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                title={t('receipts.deleteConfirm')}
                description={t('receipts.review.deleteConfirmText')}
                confirmLabel={t('receipts.review.delete')}
                cancelLabel={t('receipts.review.cancel')}
                onConfirm={handleDelete}
                destructive
                loading={deleteMutation.isPending}
            />
        </>
    );
}

// ─── Document Row ─────────────────────────────────────────────────────────────

function DocumentRow({
    doc,
    bommelName,
    onClick,
    selected,
    bulkSelected,
    onToggleBulk,
}: {
    doc: DocumentResponse;
    bommelName: string | undefined;
    onClick: () => void;
    selected: boolean;
    bulkSelected: boolean;
    onToggleBulk: () => void;
}) {
    const { t } = useTranslation();
    const hideBommel = useMediaQuery(HIDE_BOMMEL_QUERY);
    const status = getDocumentReviewStatus(doc);
    const amount = doc.total != null ? Number(doc.total) : null;
    const outgoing = doc.direction === 'OUTGOING';

    return (
        <DataTableRow columns={hideBommel ? DOC_GRID_NARROW : DOC_GRID} highlighted={selected || bulkSelected} onClick={onClick}>
            <RowCheckbox checked={bulkSelected} onToggle={onToggleBulk} ariaLabel={t('receipts.bulk.selectRow')} />

            {/* Document name */}
            <span className="flex items-center gap-3 min-w-0">
                <span
                    className="w-9 h-9 flex items-center justify-center rounded-[10px] flex-shrink-0 text-base"
                    style={{ background: 'var(--accent-surface)' }}
                >
                    {fileIcon(doc.fileContentType)}
                </span>
                <span className="flex flex-col min-w-0">
                    <span className="font-bold text-[14px] text-foreground truncate leading-snug">{doc.name || doc.fileName || '—'}</span>
                    <span className="text-[12px] text-muted-foreground truncate leading-snug">{doc.senderName ?? ''}</span>
                </span>
            </span>

            {/* Bommel, stays empty when the receipt has none */}
            {!hideBommel && (
                <span className="min-w-0">
                    {bommelName && (
                        <span className="block truncate text-[13.5px] text-muted-foreground" title={bommelName}>
                            {bommelName}
                        </span>
                    )}
                </span>
            )}

            {/* Date */}
            <span className="text-[13.5px] text-muted-foreground whitespace-nowrap tabular-nums">{fmtDate(doc.transactionTime)}</span>

            {/* Created at */}
            <span className="text-[13px] text-[var(--ink-faint)] whitespace-nowrap tabular-nums">{fmtDate(doc.createdAt)}</span>

            {/* Status */}
            <span className="flex items-center">
                <StatusBadge status={status} />
            </span>

            {/* Amount, signed by document direction */}
            <span
                className="text-right font-bold tabular-nums whitespace-nowrap"
                style={{ fontSize: 14.5, color: amount == null ? 'var(--ink-faint)' : outgoing ? 'var(--positive)' : 'var(--negative)' }}
            >
                {amount != null ? `${outgoing ? '+' : '–'} ${fmtCurrency(Math.abs(amount))}` : '—'}
            </span>
        </DataTableRow>
    );
}

// ─── Upload Dropzone ──────────────────────────────────────────────────────────

// Largest receipt accepted for upload. Kept in sync with the backend limits (org service and the
// az-document-ai analysis service, both `quarkus.http.limits.max-body-size=10M`). Enforced client-side so
// oversized files get a clear message instead of a backend 413.
const MAX_UPLOAD_MB = 10;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Why an upload failed. The first two are caught in the browser before anything is sent.
type UploadErrorKind = 'tooLarge' | 'invalidType' | 'unauthorized' | 'network' | 'server' | 'unknown';

type UploadItem = {
    key: string;
    name: string;
    size: number;
    status: 'uploading' | 'done' | 'duplicate' | 'error';
    errorKind?: UploadErrorKind;
    // For a duplicate (409), the id of the existing document so the row can link to it.
    duplicateOfId?: number;
};

// How long finished rows stay visible after the last upload of a batch settled. Duplicates a bit longer, so there is
// time to follow the link to the existing receipt.
const FINISHED_ROW_MS = 3000;
const DUPLICATE_ROW_MS = 4000;

const ACCEPTED_TYPES = { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] };

function fmtFileSize(bytes: number, locale: string): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
}

function uploadErrorKind(error: unknown): UploadErrorKind {
    if (isNetworkError(error)) return 'network';
    const status = getErrorStatus(error);
    if (status === 401 || status === 403) return 'unauthorized';
    if (status === 413) return 'tooLarge';
    if (status === 415) return 'invalidType';
    if (status != null && status >= 500) return 'server';
    return 'unknown';
}

function rejectionErrorKind(rejection: FileRejection): UploadErrorKind {
    const code = rejection.errors[0]?.code;
    if (code === 'file-too-large') return 'tooLarge';
    if (code === 'file-invalid-type') return 'invalidType';
    return 'unknown';
}

/**
 * Upload area of the receipts page. Idle it shows the dropzone and the analyze toggle. While files upload only their
 * rows are shown; files dropped meanwhile join the running batch. Once the batch has settled, a compact dropzone sits
 * above the rows; uploaded rows disappear after {@link FINISHED_ROW_MS} and duplicates after {@link DUPLICATE_ROW_MS}, failed rows stay until the user
 * removes them, so they can see which file failed and why. The analysis itself runs afterwards and shows in the table.
 */
function UploadZone({ onUploaded }: { onUploaded: () => void }) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const uploadMutation = useUploadDocument();
    // Remembered per browser, so the choice survives reloads.
    const [analyze, setAnalyze] = usePersistedState<boolean>('hopps.belege.autoAnalyze', true);
    const [items, setItems] = useState<UploadItem[]>([]);
    // Whether the upload area is collapsed to a slim bar, so the document list gets more room. The
    // component stays mounted while collapsed, so in-progress uploads keep running. The choice is remembered.
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('receipts.uploadCollapsed') === 'true');

    function toggleCollapsed() {
        setCollapsed((c) => {
            const next = !c;
            localStorage.setItem('receipts.uploadCollapsed', String(next));
            return next;
        });
    }

    const expand = useCallback(() => {
        setCollapsed(false);
        localStorage.setItem('receipts.uploadCollapsed', 'false');
    }, []);

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length === 0) return;
            // Opens the panel so the rows are visible, also when the files were dropped onto the collapsed bar.
            expand();
            const batch = acceptedFiles.map((file, i) => ({ key: `${Date.now()}-${i}-${file.name}`, file }));
            // New files join whatever is still listed: running uploads and failed rows the user has not removed yet.
            setItems((prev) => [...prev, ...batch.map(({ key, file }) => ({ key, name: file.name, size: file.size, status: 'uploading' as const }))]);

            // Each file goes up in its own request. As each one settles, its row flips and the document list is
            // refreshed right away, so results show up one by one. One failing upload does not abort the others.
            // Direction is chosen later in the detail view, not at upload.
            batch.forEach(({ key, file }) => {
                uploadMutation
                    .mutateAsync({ file, analyze, direction: 'INCOMING' })
                    .then(() => {
                        setItems((prev) => prev.map((it) => (it.key === key ? { ...it, status: 'done' } : it)));
                        onUploaded();
                    })
                    .catch((error) => {
                        const duplicateOfId = getDuplicateDocumentId(error);
                        setItems((prev) =>
                            prev.map((it) =>
                                it.key !== key
                                    ? it
                                    : duplicateOfId != null
                                      ? { ...it, status: 'duplicate', duplicateOfId }
                                      : { ...it, status: 'error', errorKind: uploadErrorKind(error) }
                            )
                        );
                    });
            });
        },
        [uploadMutation, analyze, onUploaded, expand]
    );

    // Files the dropzone rejected (too large, or an unsupported type) never reach onDrop; they get a failed row too.
    const onDropRejected = useCallback(
        (rejections: FileRejection[]) => {
            expand();
            setItems((prev) => [
                ...prev,
                ...rejections.map((r, i) => ({
                    key: `${Date.now()}-rejected-${i}-${r.file.name}`,
                    name: r.file.name,
                    size: r.file.size,
                    status: 'error' as const,
                    errorKind: rejectionErrorKind(r),
                })),
            ]);
        },
        [expand]
    );

    const isUploading = items.some((it) => it.status === 'uploading');

    // Once nothing is uploading any more, finished rows go away after a short moment. A new upload starting in the
    // meantime cancels the timers, so a batch is only cleared once all of it has settled. Keyed on `hasFinished` rather
    // than `items`, so dropping the uploaded rows does not restart the duplicate timer.
    const hasFinished = items.some((it) => it.status === 'done' || it.status === 'duplicate');
    useEffect(() => {
        if (isUploading || !hasFinished) return;
        const drop = (status: UploadItem['status']) => setItems((prev) => prev.filter((it) => it.status !== status));
        const doneTimer = setTimeout(() => drop('done'), FINISHED_ROW_MS);
        const duplicateTimer = setTimeout(() => drop('duplicate'), DUPLICATE_ROW_MS);
        return () => {
            clearTimeout(doneTimer);
            clearTimeout(duplicateTimer);
        };
    }, [isUploading, hasFinished]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
        accept: ACCEPTED_TYPES,
        maxSize: MAX_UPLOAD_BYTES,
        multiple: true,
    });

    // Drop target around the whole card while the dropzone itself is not shown: when collapsed, and while uploading
    // (files dropped then join the running batch). Click is disabled (noClick) so clicking the bar still toggles
    // collapse instead of opening a file dialog.
    const passiveDropzone = useDropzone({
        onDrop,
        onDropRejected,
        accept: ACCEPTED_TYPES,
        maxSize: MAX_UPLOAD_BYTES,
        multiple: true,
        noClick: true,
        noKeyboard: true,
    });
    const passive = collapsed || isUploading;
    const dragOverPassive = passive && passiveDropzone.isDragActive;

    const uploadCount = items.filter((it) => it.status !== 'error').length;
    const settledCount = items.filter((it) => it.status === 'done' || it.status === 'duplicate').length;
    const errorCount = items.filter((it) => it.status === 'error').length;

    const removeItem = (key: string) => setItems((prev) => prev.filter((it) => it.key !== key));
    const removeErrors = () => setItems((prev) => prev.filter((it) => it.status !== 'error'));

    const header = (
        <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('receipts.upload.expand') : t('receipts.upload.collapse')}
            className="w-full flex items-center gap-3"
        >
            <span className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: '#F3EAFB' }}>
                {isUploading ? <Loader2 size={18} className="text-[#7E3FB4] animate-spin" /> : <Upload size={18} className="text-[#7E3FB4]" />}
            </span>
            <span className="flex flex-col min-w-0 flex-1 text-left">
                <span className="text-[14px] font-bold text-[#1B1B1F]" style={{ fontFamily: FONT }}>
                    {t('receipts.upload.sectionTitle')}
                </span>
                {(collapsed || dragOverPassive) && (
                    <span className="text-[12px] text-[#9A9AA3] truncate" style={{ fontFamily: FONT }}>
                        {dragOverPassive
                            ? t('receipts.upload.dropzoneActive')
                            : isUploading
                              ? t('receipts.upload.progress', { done: settledCount, total: uploadCount })
                              : t('receipts.upload.hint')}
                    </span>
                )}
            </span>
            <ChevronDown size={18} className={cn('text-[#9A9AA3] transition-transform flex-shrink-0', collapsed ? '' : 'rotate-180')} />
        </button>
    );

    // Three states, as in the design handoff: idle (large dropzone + analyze toggle), uploading (file rows only) and
    // settled with rows left (compact dropzone on top, rows below, toggle still hidden).
    const card = (
        <>
            {header}

            {!collapsed && (
                <div className="mt-4 flex flex-col gap-3">
                    {items.length > 0 && !isUploading && (
                        <div
                            {...getRootProps()}
                            className={cn(
                                'flex items-center gap-3 rounded-[14px] border-2 border-dashed py-2.5 pl-3.5 pr-3 cursor-pointer transition-all',
                                isDragActive ? 'border-[#9955CC] bg-[#F3EAFB]' : 'border-[#E0E0E6] hover:border-[#C7A2E3] hover:bg-[#FAFAFA]'
                            )}
                        >
                            <input {...getInputProps()} />
                            <span className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: '#F3EAFB' }}>
                                <Upload size={17} className="text-[#7E3FB4]" />
                            </span>
                            <span className="flex-1 min-w-0 truncate text-[14px] font-bold text-foreground" style={{ fontFamily: FONT }}>
                                {isDragActive ? t('receipts.upload.dropzoneActive') : t('receipts.upload.dropzoneMore')}
                            </span>
                            <BaseButton type="button" variant="tonal" size="sm" className="font-bold">
                                {t('receipts.upload.chooseFiles')}
                            </BaseButton>
                        </div>
                    )}

                    {items.length === 0 && (
                        <div
                            {...getRootProps()}
                            className={cn(
                                'flex flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed py-10 px-6 cursor-pointer transition-all',
                                isDragActive ? 'border-[#9955CC] bg-[#F3EAFB]' : 'border-[#E0E0E6] hover:border-[#C7A2E3] hover:bg-[#FAFAFA]'
                            )}
                        >
                            <input {...getInputProps()} />
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center"
                                style={{ background: isDragActive ? '#E0C8F5' : '#F3EAFB' }}
                            >
                                <Upload size={26} className="text-[#7E3FB4]" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-[15px] text-[#1B1B1F]" style={{ fontFamily: FONT }}>
                                    {isDragActive ? t('receipts.upload.dropzoneActive') : t('receipts.upload.dropzone')}
                                </p>
                                <p className="mt-1 text-[13px] text-[#9A9AA3]" style={{ fontFamily: FONT }}>
                                    {t('receipts.upload.hint')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* One row per file: running uploads, for a short moment the finished ones, failed ones until removed. */}
                    {items.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            {!isUploading && errorCount > 1 && (
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-[12px] font-semibold text-muted-foreground">{t('receipts.upload.failedCount', { count: errorCount })}</p>
                                    <button type="button" onClick={removeErrors} className="text-[12px] font-bold text-purple-700 hover:text-purple-900">
                                        {t('receipts.upload.removeAll')}
                                    </button>
                                </div>
                            )}
                            {items.map((it) => {
                                const failed = it.status === 'error';
                                return (
                                    <div
                                        key={it.key}
                                        role={failed ? 'alert' : undefined}
                                        className="flex items-center gap-3 rounded-[12px] border px-3.5 py-[9px]"
                                        style={{
                                            borderColor: failed ? 'color-mix(in oklch, var(--negative) 28%, transparent)' : 'var(--border-soft)',
                                            background: failed ? 'var(--negative-surface)' : 'var(--surface-sunken)',
                                        }}
                                    >
                                        <span
                                            className="w-[26px] h-[26px] rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{
                                                background: failed
                                                    ? undefined
                                                    : it.status === 'done'
                                                      ? 'var(--positive-surface)'
                                                      : it.status === 'duplicate'
                                                        ? 'var(--warning-surface)'
                                                        : 'var(--accent-surface)',
                                            }}
                                        >
                                            {it.status === 'uploading' && <Loader2 size={14} className="text-purple-700 animate-spin" />}
                                            {it.status === 'done' && <Check size={14} strokeWidth={2.5} className="text-[var(--positive)]" />}
                                            {it.status === 'duplicate' && <AlertCircle size={14} className="text-[var(--warning)]" />}
                                            {failed && <AlertCircle size={14} className="text-[var(--negative)]" />}
                                        </span>
                                        <span className="flex-1 min-w-0 truncate text-[14px] font-semibold text-foreground">{it.name}</span>
                                        <span className="flex-shrink-0 flex items-center gap-3 text-[13px] font-bold">
                                            {it.status === 'uploading' && <span className="text-muted-foreground">{t('receipts.upload.itemUploading')}</span>}
                                            {it.status === 'done' && <span className="text-[var(--positive)]">{t('receipts.upload.itemDone')}</span>}
                                            {it.status === 'duplicate' && (
                                                <>
                                                    <span className="text-[var(--warning)]">{t('receipts.upload.itemErrorDuplicate')}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/receipts?id=${it.duplicateOfId}`)}
                                                        className="inline-flex items-center gap-1 text-purple-700 hover:underline"
                                                    >
                                                        <ExternalLink size={12} />
                                                        {t('receipts.upload.viewExisting')}
                                                    </button>
                                                </>
                                            )}
                                            {failed && (
                                                <span className="text-[12.5px] font-semibold text-[var(--negative)]">
                                                    {t(`receipts.upload.errors.${it.errorKind ?? 'unknown'}`, { max: MAX_UPLOAD_MB })}
                                                    {/* The size only helps when it is the reason. */}
                                                    {it.errorKind === 'tooLarge' && (
                                                        <>
                                                            {' · '}
                                                            <span className="tabular-nums">{fmtFileSize(it.size, i18n.language)}</span>
                                                        </>
                                                    )}
                                                </span>
                                            )}
                                            {failed && (
                                                <BaseButton
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeItem(it.key)}
                                                    aria-label={t('receipts.upload.remove')}
                                                    title={t('receipts.upload.remove')}
                                                    className="h-7 w-7 text-[var(--negative)] hover:bg-[var(--background-secondary)] hover:text-[var(--negative)]"
                                                >
                                                    <X />
                                                </BaseButton>
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* AI analyze toggle: only in the idle state. What the analysis does is explained in the info tooltip. */}
                    {items.length === 0 && (
                        <div
                            className="flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors"
                            style={{
                                borderColor: analyze ? 'color-mix(in oklch, var(--primary) 32%, transparent)' : 'var(--border-soft)',
                                background: analyze ? 'var(--accent-surface)' : 'var(--surface-sunken)',
                                fontFamily: FONT,
                            }}
                        >
                            <BaseSwitch id="receipts-auto-analyze" checked={analyze} onCheckedChange={setAnalyze} />
                            <label
                                htmlFor="receipts-auto-analyze"
                                className={cn('cursor-pointer text-[14px] font-extrabold', analyze ? 'text-purple-700' : 'text-foreground')}
                            >
                                {t('receipts.upload.analyzeLabel')}
                            </label>
                            <InfoTooltip
                                content={t('receipts.upload.analyzeHint')}
                                label={t('receipts.upload.analyzeHint')}
                                className="text-muted-foreground hover:text-foreground"
                            />
                        </div>
                    )}
                </div>
            )}
        </>
    );

    return (
        <div
            className="rounded-[18px] border border-[#E9E9EE] px-5 py-4"
            style={{ background: '#FFFFFF', boxShadow: '0 1px 2px rgba(20,20,40,.05), 0 6px 22px rgba(20,20,40,.05)' }}
        >
            {passive ? (
                <div
                    {...passiveDropzone.getRootProps()}
                    className={cn('-mx-2 -my-1 px-2 py-1 rounded-[12px] transition-colors', dragOverPassive && 'bg-[#F3EAFB] ring-2 ring-inset ring-[#9955CC]')}
                >
                    <input {...passiveDropzone.getInputProps()} />
                    {card}
                </div>
            ) : (
                card
            )}
        </div>
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function BelegeView() {
    const { t } = useTranslation();
    usePageTitle(t('receipts.title'));

    // Selected status segments; empty means every receipt. New storage key: the old one held a single tab id.
    const [statusFilter, setStatusFilter] = usePersistedState<ReceiptStatus[]>('hopps.belege.statusFilter', ['unreviewed']);
    const [sortBy, setSortBy] = usePersistedState<'createdAt' | 'updatedAt' | 'transactionTime' | 'total'>('hopps.belege.sortBy', 'createdAt');
    const [sortDir, setSortDir] = usePersistedState<'asc' | 'desc'>('hopps.belege.sortDir', 'desc');
    const [selectedDoc, setSelectedDoc] = useState<DocumentResponse | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [search, setSearch] = useState('');
    const bulkDelete = useDeleteDocument();

    const { data: allDocs, isLoading, refetch } = useDocuments();

    const docs = (allDocs ?? []) as DocumentResponse[];

    const queryClient = useQueryClient();
    const { showWarning, showSuccess } = useToast();
    const reanalyzeDocuments = useReanalyzeDocuments();

    // Receipts that can be (re-)analyzed: previously failed or never analyzed. Drives both the button's
    // visibility and which documents the bulk action targets — already-analyzed receipts are left untouched.
    const reanalyzable = docs.filter(canReanalyzeDocument);

    // Selected receipts that can be analyzed again: not confirmed, with a file, and not already being analyzed. Unlike
    // the "re-analyze all" action this includes receipts whose analysis succeeded, the same as the button in the drawer.
    const reanalyzableSelected = docs.filter(
        (d) =>
            d.id != null &&
            selectedIds.has(d.id) &&
            d.documentStatus !== 'CONFIRMED' &&
            !!d.fileName &&
            d.analysisStatus !== 'PENDING' &&
            d.analysisStatus !== 'ANALYZING'
    );

    async function handleReanalyzeSelected() {
        const ids = reanalyzableSelected.map((d) => d.id).filter((id): id is number => id != null);
        if (ids.length === 0) return;
        const count = await reanalyzeDocuments.mutateAsync(ids);
        showSuccess(t('receipts.reanalyzeStarted', { count }));
    }

    async function handleReanalyzeAll() {
        const ids = reanalyzable.map((d) => d.id).filter((id): id is number => id != null);
        if (ids.length === 0) return;
        const count = await reanalyzeDocuments.mutateAsync(ids);
        showSuccess(t('receipts.reanalyzeStarted', { count }));
    }

    // Load the organization's bommels so the detail view's bommel select is populated.
    const { organization } = useStore();
    const allBommels = useBommelsStore((s) => s.allBommels);
    const bommelCount = allBommels.length;
    const bommelNames = new Map(allBommels.map((b) => [b.id, b.name]));
    const hideBommel = useMediaQuery(HIDE_BOMMEL_QUERY);
    const loadBommels = useBommelsStore((s) => s.loadBommels);
    useEffect(() => {
        if (organization?.id && bommelCount === 0) {
            loadBommels(organization.id);
        }
    }, [organization?.id, bommelCount, loadBommels]);

    // Live updates: reload the whole document list whenever the backend signals a change (e.g. analysis finished).
    // The message carries the exact document ID, but we always reload the full list.
    useDocumentEvents(() => {
        queryClient.invalidateQueries({ queryKey: documentKeys.all });
    });

    // Notify the user when a receipt could not be analysed because the analysis service was unreachable.
    const toastedRef = useRef<Set<number>>(new Set());
    const seededRef = useRef(false);
    useEffect(() => {
        if (!allDocs) return;
        const unavailable = docs.filter((d) => d.analysisError === ANALYSIS_SERVICE_UNAVAILABLE && d.id != null);
        if (!seededRef.current) {
            // Don't notify for failures that already existed when the page opened — only for new ones.
            unavailable.forEach((d) => toastedRef.current.add(d.id!));
            seededRef.current = true;
            return;
        }
        for (const d of unavailable) {
            if (!toastedRef.current.has(d.id!)) {
                toastedRef.current.add(d.id!);
                showWarning(t('receipts.analysisUnavailable.title'), {
                    description: t('receipts.analysisUnavailable.description'),
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allDocs]);

    // Open a specific document when navigated to with ?id= (e.g. from a linked transaction, or the duplicate-upload
    // link). The document may not be in the currently loaded/filtered list, so fall back to fetching it directly — that
    // way the deep link always opens its drawer.
    const [searchParams, setSearchParams] = useSearchParams();
    const idParam = searchParams.get('id');
    const { data: deepLinkedDoc } = useDocument(idParam ? Number(idParam) : undefined);
    useEffect(() => {
        if (!idParam) return;
        const found = (allDocs as DocumentResponse[] | undefined)?.find((d) => d.id === Number(idParam)) ?? deepLinkedDoc;
        if (found) setSelectedDoc(found);
    }, [idParam, allDocs, deepLinkedDoc]);

    const closeDrawer = () => {
        setSelectedDoc(null);
        if (searchParams.has('id')) {
            searchParams.delete('id');
            setSearchParams(searchParams, { replace: true });
        }
    };

    // Free-text search across the fields shown in the list (name, file name, sender) plus the amount. A purely numeric
    // term is additionally matched against the absolute total so a receipt can be found by pasting its amount.
    const searchTerm = search.trim().toLowerCase();
    const searchAmount = (() => {
        const normalized = search.trim().replace(/\s/g, '').replace(',', '.');
        if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
        const n = Number(normalized);
        return Number.isFinite(n) ? Math.abs(n) : null;
    })();

    const filtered = docs.filter((doc) => {
        if (statusFilter.length > 0 && !statusFilter.includes(receiptStatus(doc))) return false;
        if (searchTerm) {
            const matchesText =
                (doc.name ?? '').toLowerCase().includes(searchTerm) ||
                (doc.fileName ?? '').toLowerCase().includes(searchTerm) ||
                (doc.senderName ?? '').toLowerCase().includes(searchTerm);
            const matchesAmount = searchAmount != null && doc.total != null && Math.abs(Number(doc.total)) === searchAmount;
            if (!matchesText && !matchesAmount) return false;
        }
        return true;
    });

    const sortValue = (d: DocumentResponse): number => {
        switch (sortBy) {
            case 'total':
                return d.total != null ? Number(d.total) : 0;
            case 'transactionTime':
                return d.transactionTime ? new Date(d.transactionTime).getTime() : 0;
            case 'updatedAt':
                return d.updatedAt ? new Date(d.updatedAt).getTime() : 0;
            default:
                return d.createdAt ? new Date(d.createdAt).getTime() : 0;
        }
    };
    const sorted = [...filtered].sort((a, b) => (sortDir === 'asc' ? sortValue(a) - sortValue(b) : sortValue(b) - sortValue(a)));

    // ── Bulk selection (for multi-delete) ──
    const pageIds = sorted.map((d) => d.id).filter((id): id is number => id != null);
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

    // The header checkbox toggles the whole current (filtered) list.
    const toggleSelectAll = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allPageSelected) pageIds.forEach((id) => next.delete(id));
            else pageIds.forEach((id) => next.add(id));
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds);
        // allSettled so one failed delete doesn't abort the rest; the list refetches via query invalidation.
        await Promise.allSettled(ids.map((id) => bulkDelete.mutateAsync(id)));
        if (selectedDoc?.id != null && selectedIds.has(selectedDoc.id)) setSelectedDoc(null);
        clearSelection();
        setBulkDeleteOpen(false);
    };

    // Toggle sorting from a table column header: same column flips direction, new column starts descending.
    const handleSort = (field: typeof sortBy) => {
        if (sortBy === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(field);
            setSortDir('desc');
        }
    };

    const unreviewedCount = docs.filter((d) => receiptStatus(d) === 'unreviewed').length;
    const statusCounts: Record<ReceiptStatus, number> = { unreviewed: unreviewedCount, confirmed: docs.length - unreviewedCount };
    const toggleStatus = (id: ReceiptStatus) => setStatusFilter((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    const onlyUnreviewed = statusFilter.length === 1 && statusFilter[0] === 'unreviewed';

    return (
        <div className="flex flex-col w-full" style={{ fontFamily: FONT, background: '#F3F4F6' }}>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                    <h1 className="font-bold text-[#1B1B1F] leading-tight" style={{ fontSize: 26 }}>
                        {t('receipts.title')}
                    </h1>
                    <p className="mt-1 text-[13.5px] text-[#6B6B76]">{t('receipts.subtitle', { count: unreviewedCount })}</p>
                </div>
            </div>

            {/* Upload zone */}
            <div className="mb-4">
                <UploadZone onUploaded={() => refetch()} />
            </div>

            {/* Filter tabs + bulk re-analyze action */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <StatusSegments
                    ariaLabel={t('transactions.columns.status')}
                    segments={RECEIPT_STATUS_SEGMENTS.map((seg) => ({ ...seg, label: t(seg.labelKey), count: statusCounts[seg.id] }))}
                    selected={statusFilter}
                    onToggle={toggleStatus}
                />

                {/* Right side: re-analyze action + search, pushed to the far right, aligned with the tabs. */}
                <div className="ml-auto flex items-center gap-2">
                    {/* Only shown when there are receipts that can actually be re-analyzed (failed / not yet analyzed). */}
                    {reanalyzable.length > 0 && (
                        <button
                            type="button"
                            onClick={handleReanalyzeAll}
                            disabled={reanalyzeDocuments.isPending}
                            className="inline-flex h-11 items-center gap-[7px] whitespace-nowrap rounded-[var(--btn-radius)] border border-border-soft bg-[var(--background-secondary)] px-3.5 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:border-purple-300 hover:text-foreground disabled:opacity-50"
                        >
                            <RefreshCw size={15} className={reanalyzeDocuments.isPending ? 'animate-spin' : ''} />
                            {t('receipts.reanalyzeAll')}
                            <span
                                className="grid place-items-center rounded-full px-[5px] text-[11.5px] font-extrabold text-purple-700"
                                style={{ minWidth: 20, height: 20, background: 'var(--accent-surface)' }}
                            >
                                {reanalyzable.length}
                            </span>
                        </button>
                    )}

                    {/* Search, same look as on the transactions page */}
                    <div className="relative w-64 max-w-full">
                        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('receipts.searchPlaceholder')}
                            className="h-11 w-full rounded-xl border border-border-soft bg-[var(--background-secondary)] pl-[38px] pr-9 text-[14.5px] text-foreground transition-shadow placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-surface)]"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                aria-label={t('receipts.searchClear')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] transition-colors hover:text-foreground"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Bulk selection toolbar */}
            {selectedIds.size > 0 && (
                <BulkActionBar
                    className="mb-3"
                    label={t('receipts.bulk.selectedCount', { n: selectedIds.size })}
                    clearLabel={t('receipts.bulk.clear')}
                    onClear={clearSelection}
                >
                    <BaseButton
                        variant="outline"
                        size="sm"
                        onClick={handleReanalyzeSelected}
                        disabled={reanalyzableSelected.length === 0 || reanalyzeDocuments.isPending}
                        className="gap-1.5 font-bold bg-[var(--background-secondary)]"
                    >
                        <RefreshCw className={reanalyzeDocuments.isPending ? 'animate-spin' : ''} />
                        {t('receipts.bulk.reanalyze', { n: reanalyzableSelected.length })}
                    </BaseButton>
                    <BaseButton
                        variant="destructive"
                        size="sm"
                        onClick={() => setBulkDeleteOpen(true)}
                        disabled={bulkDelete.isPending}
                        className="gap-1.5 font-bold"
                    >
                        <Trash2 />
                        {t('receipts.bulk.delete')}
                    </BaseButton>
                </BulkActionBar>
            )}

            {/* Document list */}
            <div>
                {isLoading ? (
                    <LoadingState className="py-12" />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty
                        title={
                            searchTerm ? t('receipts.noSearchResults', { search }) : onlyUnreviewed ? t('receipts.noUnreviewed') : t('transactions.noResults')
                        }
                        description={searchTerm ? undefined : onlyUnreviewed ? t('receipts.noUnreviewedDesc') : t('transactions.noResultsDesc')}
                    />
                ) : (
                    <DataTable>
                        <DataTableHeader columns={hideBommel ? DOC_GRID_NARROW : DOC_GRID}>
                            {/* Select-all checkbox (current list) */}
                            <RowCheckbox
                                checked={allPageSelected ? true : somePageSelected ? 'mixed' : false}
                                onToggle={toggleSelectAll}
                                ariaLabel={t('receipts.bulk.selectAll')}
                            />
                            <HeaderCell>{t('receipts.columns.document')}</HeaderCell>
                            {!hideBommel && <HeaderCell>{t('transactions.columns.bommel')}</HeaderCell>}
                            <SortHeader
                                label={t('receipts.columns.date')}
                                active={sortBy === 'transactionTime'}
                                direction={sortDir}
                                onClick={() => handleSort('transactionTime')}
                                variant="klar"
                            />
                            <SortHeader
                                label={t('receipts.columns.createdAt')}
                                active={sortBy === 'createdAt'}
                                direction={sortDir}
                                onClick={() => handleSort('createdAt')}
                                variant="klar"
                            />
                            <HeaderCell>{t('receipts.columns.status')}</HeaderCell>
                            <SortHeader
                                label={t('receipts.columns.amount')}
                                active={sortBy === 'total'}
                                direction={sortDir}
                                onClick={() => handleSort('total')}
                                align="right"
                                variant="klar"
                            />
                        </DataTableHeader>

                        {sorted.map((doc) => (
                            <DocumentRow
                                key={doc.id}
                                doc={doc}
                                bommelName={doc.bommelId != null ? bommelNames.get(doc.bommelId) : undefined}
                                onClick={() => setSelectedDoc(doc)}
                                selected={selectedDoc?.id === doc.id}
                                bulkSelected={doc.id != null && selectedIds.has(doc.id)}
                                onToggleBulk={() => doc.id != null && toggleSelect(doc.id)}
                            />
                        ))}
                    </DataTable>
                )}
            </div>

            {/* Review drawer */}
            <ReviewDrawer doc={selectedDoc} onClose={closeDrawer} onDeleted={closeDrawer} />

            <ConfirmDialog
                open={bulkDeleteOpen}
                onOpenChange={setBulkDeleteOpen}
                title={t('receipts.bulk.confirmTitle')}
                description={t('receipts.bulk.confirmDesc', { n: selectedIds.size })}
                confirmLabel={t('receipts.bulk.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={handleBulkDelete}
                destructive
                loading={bulkDelete.isPending}
            />
        </div>
    );
}
