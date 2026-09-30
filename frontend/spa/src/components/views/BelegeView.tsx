import { DocumentDirection, DocumentResponse, ExtractionSource, DocumentUpdateRequest, TransactionUpdateRequest } from '@hopps/api-client';
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
    Coins,
    ExternalLink,
    Link2,
    PencilLine,
    Search,
    ChevronRight,
    Info,
} from 'lucide-react';
import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import CategoryGroupFields from '@/components/CategoryGroups/CategoryGroupFields';
import { buildBommelIndex, missingRequiredGroups } from '@/components/CategoryGroups/helpers';
import { LoadingState } from '@/components/common/LoadingState';
import { ALL_BOMMELS, BommelSelect } from '@/components/Dashboard/BommelSelect';
import { flattenBommelTree } from '@/components/Dashboard/bommelTree';
import { cacheBommelChoice, getCachedBommelId } from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector';
import { DocumentFilePreview } from '@/components/Receipts/DocumentFilePreview';
import { BankMatchSection } from '@/components/Transactions/BankMatchSection';
import { DirectionCards, Field, footerBtn, inputCls } from '@/components/Transactions/drawerParts';
import { Eyebrow } from '@/components/Transactions/Eyebrow';
import { HIDE_BOMMEL_QUERY } from '@/components/Transactions/layout';
import { Badge, type BadgeTone, StatusBadge as TxStatusBadge } from '@/components/Transactions/StatusBadge';
import { TxIcon } from '@/components/Transactions/TxIcon';
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

// ─── Review Drawer ────────────────────────────────────────────────────────────

// Exported so the Konten (bank accounts) page can reuse the exact same receipt-review / transaction-reconcile flow:
// after uploading a receipt onto a bank transaction there, the user stays on the Konten page and completes + confirms
// the transaction in this drawer instead of being navigated to the receipts page. The component is self-contained
// (driven only by the `doc` prop and the callbacks), so reusing it needs no view-level state from BelegeView.

// Input with a spinner while the AI analysis may still fill it.
function DrawerInput({
    value,
    onChange,
    loading = false,
    type = 'text',
    inputMode,
}: {
    value: string;
    onChange: (v: string) => void;
    loading?: boolean;
    type?: string;
    inputMode?: 'decimal' | 'text';
}) {
    return (
        <div className="relative">
            <input type={type} inputMode={inputMode} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, loading && 'pr-9')} />
            {loading && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-purple-700">
                    <Loader2 size={15} className="animate-spin" />
                </span>
            )}
        </div>
    );
}

// Label/value card rows, as in the transaction drawer's read view.
function InfoRows({ rows }: { rows: [string, React.ReactNode][] }) {
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

// One line under the direction cards saying what the analysis did. Tone follows the list badges.
function AnalysisNotice({ tone, icon, title, hint }: { tone: 'info' | 'warn' | 'neutral'; icon: React.ReactNode; title: string; hint?: string }) {
    const colors = {
        info: { bg: 'var(--info-surface)', ink: 'var(--info)' },
        warn: { bg: 'var(--warning-surface)', ink: 'var(--warning)' },
        neutral: { bg: 'var(--surface-sunken)', ink: 'var(--muted-foreground)' },
    }[tone];
    return (
        <div className="flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[13px]" style={{ background: colors.bg, color: colors.ink }}>
            <span className="flex-shrink-0">{icon}</span>
            <span className="min-w-0 flex-1 font-bold">{title}</span>
            {hint && <InfoTooltip content={hint} label={hint} align="end" className="text-current opacity-70 hover:text-current hover:opacity-100" />}
        </div>
    );
}

// Colour of the data source badge in the "Beleg" tab: an e-invoice is exact, AI values want checking (gold, like
// "Zu prüfen"), manual entries are neutral.
const EXTRACTION_TONE: Record<ExtractionSource, BadgeTone> = { ZUGFERD: 'pos', AI: 'warn', MANUAL: 'neutral' };

// Values of the review form; compared against the loaded state to tell whether there are unsaved changes.
type ReviewForm = {
    name: string;
    amount: string;
    date: string;
    senderName: string;
    bommelId: string;
    privatelyPaid: boolean;
    direction: DocumentDirection;
    categoryValues: Record<number, string>;
};

function sameCategoryValues(a: Record<number, string>, b: Record<number, string>): boolean {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => a[Number(k)] === b[Number(k)]);
}

export function ReviewDrawer({ doc: docProp, onClose, onDeleted }: { doc: DocumentResponse | null; onClose: () => void; onDeleted: () => void }) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const confirmMutation = useConfirmDocument();
    const updateMutation = useUpdateDocument();
    const deleteMutation = useDeleteDocument();
    const reanalyzeMutation = useReanalyzeDocument();
    const updateTransaction = useUpdateTransaction();
    const confirmTransaction = useConfirmTransaction();
    const { showSuccess, showInfo, showError } = useToast();

    // Live document: polls while the AI analysis is still running so results appear automatically.
    const { data: liveDoc } = useDocument(docProp?.id);
    const doc = liveDoc ?? docProp;

    // A receipt is "confirmed" once its transaction was created. From then on the drawer is a read view; the values are
    // corrected in the transaction drawer. Read from the live document, so creating the transaction switches the open
    // drawer over right away.
    const locked = doc?.documentStatus === 'CONFIRMED';
    const linkedTransactionId = doc?.transactionId ?? undefined;
    const hasLinkedTransaction = linkedTransactionId != null;
    // Receipts created from a bank movement already carry a (draft) transaction before they are confirmed. Their form
    // edits that transaction.
    const isBankReconcile = hasLinkedTransaction && !locked;
    const { data: linkedTx } = useTransaction(linkedTransactionId ?? 0);
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
    // Without a root id the tree keeps the root bommel itself, so a receipt can be booked on the whole organization.
    const bommelItems = useMemo(() => flattenBommelTree(reviewAllBommels), [reviewAllBommels]);
    const [detailTab, setDetailTab] = useState<'transaction' | 'receipt'>('transaction');
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    // The form as it was loaded (plus values the analysis filled in since). The form is "unsaved" when it differs from
    // this, so going back to the previous value clears the hint again.
    const [baseline, setBaseline] = useState<ReviewForm | null>(null);
    const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
    useEffect(() => {
        setDetailTab('transaction');
    }, [docProp?.id]);

    const open = docProp !== null;
    const analysisStatus = doc?.analysisStatus;
    const isAnalyzing = analysisStatus === 'PENDING' || analysisStatus === 'ANALYZING';
    const status = doc ? getDocumentReviewStatus(doc) : 'pending';
    const serviceUnavailable = doc?.analysisError === ANALYSIS_SERVICE_UNAVAILABLE;

    // Initialize the form once per opened document (uses the list snapshot, which already holds any previously
    // extracted data for already-analyzed receipts).
    const initializedIdRef = useRef<number | null>(null);
    useEffect(() => {
        if (!docProp) {
            initializedIdRef.current = null;
            return;
        }
        if (initializedIdRef.current === docProp.id) return;

        if (hasLinkedTransaction && docProp.documentStatus !== 'CONFIRMED') {
            // Bank-origin receipt: seed the form from its transaction; wait until it has loaded.
            if (!linkedTx) return;
            initializedIdRef.current = docProp.id ?? null;
            const cv: Record<number, string> = {};
            (linkedTx.categoryValues ?? []).forEach((c) => {
                if (c.groupId != null && c.value != null) cv[c.groupId] = c.value;
            });
            applyForm({
                name: linkedTx.name ?? '',
                amount: linkedTx.total != null ? String(Math.abs(Number(linkedTx.total))) : '',
                date: linkedTx.transactionTime ? new Date(linkedTx.transactionTime).toISOString().slice(0, 10) : '',
                senderName: linkedTx.senderName ?? '',
                // A freshly created draft carries no bommel, so this falls back to the shared "last used" bommel cache.
                bommelId: initialBommelId(linkedTx.bommelId),
                privatelyPaid: linkedTx.privatelyPaid ?? false,
                direction: Number(linkedTx.total ?? 0) < 0 ? 'INCOMING' : 'OUTGOING',
                categoryValues: cv,
            });
            return;
        }

        initializedIdRef.current = docProp.id ?? null;
        applyForm({
            name: docProp.name ?? '',
            amount: docProp.total != null ? String(Math.abs(Number(docProp.total))) : '',
            date: docProp.transactionTime ? new Date(docProp.transactionTime).toISOString().slice(0, 10) : '',
            senderName: docProp.senderName ?? '',
            bommelId: initialBommelId(docProp.bommelId),
            privatelyPaid: docProp.privatelyPaid ?? false,
            direction: docProp.direction ?? 'INCOMING',
            categoryValues: {},
        });
    }, [docProp, hasLinkedTransaction, linkedTx]);

    function applyForm(f: ReviewForm) {
        setName(f.name);
        setAmount(f.amount);
        setDate(f.date);
        setSenderName(f.senderName);
        setBommelId(f.bommelId);
        setPrivatelyPaid(f.privatelyPaid);
        setDirection(f.direction);
        setCategoryValues(f.categoryValues);
        setBaseline(f);
    }

    // As the AI analysis streams in, fill ONLY the fields the user has left empty. Manually entered values are kept.
    // Skipped for bank-origin receipts: there the form shows the transaction and the AI values live in the "Beleg" tab.
    useEffect(() => {
        if (hasLinkedTransaction) return;
        if (!liveDoc || liveDoc.id !== initializedIdRef.current) return;
        if (liveDoc.name) setName((p) => p || liveDoc.name!);
        if (liveDoc.total != null) setAmount((p) => p || String(Math.abs(Number(liveDoc.total))));
        if (liveDoc.transactionTime) setDate((p) => p || new Date(liveDoc.transactionTime!).toISOString().slice(0, 10));
        if (liveDoc.senderName) setSenderName((p) => p || liveDoc.senderName!);
        if (liveDoc.bommelId != null) setBommelId((p) => p || String(liveDoc.bommelId));
        setBaseline((b) =>
            b
                ? {
                      ...b,
                      name: b.name || liveDoc.name || '',
                      amount: b.amount || (liveDoc.total != null ? String(Math.abs(Number(liveDoc.total))) : ''),
                      date: b.date || (liveDoc.transactionTime ? new Date(liveDoc.transactionTime).toISOString().slice(0, 10) : ''),
                      senderName: b.senderName || liveDoc.senderName || '',
                      bommelId: b.bommelId || (liveDoc.bommelId != null ? String(liveDoc.bommelId) : ''),
                  }
                : b
        );
    }, [liveDoc, hasLinkedTransaction]);

    const dirty =
        baseline != null &&
        (name !== baseline.name ||
            amount !== baseline.amount ||
            date !== baseline.date ||
            senderName !== baseline.senderName ||
            bommelId !== baseline.bommelId ||
            privatelyPaid !== baseline.privatelyPaid ||
            direction !== baseline.direction ||
            !sameCategoryValues(categoryValues, baseline.categoryValues));

    // Refresh the list once analysis finishes so the row's status/amount update too.
    const prevAnalyzingRef = useRef(false);
    useEffect(() => {
        if (prevAnalyzingRef.current && !isAnalyzing) {
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
        }
        prevAnalyzingRef.current = isAnalyzing;
    }, [isAnalyzing, queryClient]);

    // AI-extracted values from the analysed document, shown in the "Beleg" tab.
    const aiName = liveDoc?.name ?? undefined;
    const aiAmount = liveDoc?.total != null ? String(Math.abs(Number(liveDoc.total))) : undefined;
    const aiDate = liveDoc?.transactionTime ? new Date(liveDoc.transactionTime).toISOString().slice(0, 10) : undefined;
    const aiSender = liveDoc?.senderName ?? undefined;
    const aiRecipient = liveDoc?.recipientName || undefined;
    // The extracted party matching the current direction: expense (INCOMING) → the merchant/sender, income (OUTGOING) →
    // the customer/recipient.
    const aiCounterparty = direction === 'OUTGOING' ? aiRecipient : aiSender;
    const receiptHasData = !!(aiName || aiAmount || aiDate || aiSender || aiRecipient);
    // Values count as scanned only while they still come from the analysis: saving the receipt marks it MANUAL, and from
    // then on the fields hold the user's values, not the recognized ones.
    const hasScannedValues = receiptHasData && (doc?.extractionSource === 'AI' || doc?.extractionSource === 'ZUGFERD');

    // For income the counterparty is the recipient, so the sender field is labelled "Empfänger".
    const senderLabel = direction === 'OUTGOING' ? t('receipts.review.recipient') : t('receipts.review.sender');

    // Switching direction fills the counterparty field from the party the analysis extracted for that direction. Only
    // overwrites when an extracted value exists, so a value the user typed isn't wiped.
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
            // Send 0 (not undefined) when the field is empty so a removed bommel is actually cleared server-side.
            bommelId: bommelId ? Number(bommelId) : 0,
            privatelyPaid,
            direction,
        });
    }

    // For a bank-origin receipt the values are written onto the EXISTING transaction (signed by direction).
    function buildTransactionPayload() {
        const rawAmount = parseFloat(amount.replace(',', '.'));
        const signed = isNaN(rawAmount) ? undefined : direction === 'OUTGOING' ? Math.abs(rawAmount) : -Math.abs(rawAmount);
        return new TransactionUpdateRequest({
            name: name || undefined,
            total: signed,
            transactionDate: date || undefined,
            senderName: senderName || undefined,
            bommelId: bommelId ? Number(bommelId) : 0,
            privatelyPaid,
            categoryValues,
        });
    }

    // Save the values without confirming. The drawer stays open; only the close button closes it. The saved values become
    // the new reference, so the "unsaved" hint goes away.
    async function handleSave() {
        if (!doc?.id) return;
        const saved: ReviewForm = { name, amount, date, senderName, bommelId, privatelyPaid, direction, categoryValues };
        try {
            if (isBankReconcile && linkedTransactionId) {
                await updateTransaction.mutateAsync({ id: linkedTransactionId, data: buildTransactionPayload() });
                setBaseline(saved);
            } else {
                // Attach the id onto the DocumentUpdateRequest instance (a spread would drop the class shape).
                await updateMutation.mutateAsync(Object.assign(buildPayload(), { id: doc.id }));
                setBaseline(saved);
            }
            showSuccess(t('receipts.toast.saved'));
        } catch {
            // Shown by the global mutation error handler.
        }
    }

    // Confirm the receipt: creates the (draft) transaction from it, or for a bank-origin receipt keeps the existing one.
    // The drawer stays open; the live document now is CONFIRMED, so it switches to the read view where bank movements
    // can be linked.
    async function handleCreateTransaction() {
        if (!doc?.id) return;
        // Required category groups of the chosen bommel must be filled before the transaction is created.
        if (formMissingGroups.length > 0) {
            showError(t('categoryGroups.fields.missing', { groups: formMissingGroups.map((g) => g.name).join(', ') }));
            return;
        }
        try {
            if (isBankReconcile && linkedTransactionId) {
                await updateTransaction.mutateAsync({ id: linkedTransactionId, data: buildTransactionPayload() });
                await confirmMutation.mutateAsync({ id: doc.id, categoryValues });
                showSuccess(t('receipts.toast.receiptConfirmed'));
            } else {
                await updateMutation.mutateAsync(Object.assign(buildPayload(), { id: doc.id }));
                await confirmMutation.mutateAsync({ id: doc.id, categoryValues });
                showSuccess(t('receipts.toast.transactionCreated'));
            }
        } catch {
            // Shown by the global mutation error handler.
            return;
        }
        setDetailTab('transaction');
    }

    // Confirm the linked draft transaction from the read view (same rule as in the transaction drawer).
    async function handleConfirmTransaction() {
        if (!linkedTransactionId) return;
        try {
            await confirmTransaction.mutateAsync(linkedTransactionId);
            showSuccess(t('transactions.toast.confirmed'));
        } catch {
            // Shown by the global mutation error handler.
        }
    }

    async function handleDelete() {
        if (!doc?.id) return;
        try {
            await deleteMutation.mutateAsync(doc.id);
        } catch {
            // Shown by the global mutation error handler.
            setConfirmDeleteOpen(false);
            return;
        }
        showSuccess(t('receipts.toast.deleted'));
        setConfirmDeleteOpen(false);
        onDeleted();
        onClose();
    }

    // Closing with unsaved edits asks first.
    function tryClose() {
        if (dirty && !locked) setConfirmDiscardOpen(true);
        else onClose();
    }

    // Required category groups of the form's bommel that still have no value; they block "Transaktion erstellen".
    const formMissingGroups = missingRequiredGroups(categoryGroups, bommelId ? Number(bommelId) : null, buildBommelIndex(reviewAllBommels), categoryValues);

    const busy = updateMutation.isPending || confirmMutation.isPending || updateTransaction.isPending || confirmTransaction.isPending;

    // Whether the linked draft transaction may be confirmed from the read view: its saved values complete, the amount
    // exactly covered by the linked bank movements, and required category groups filled.
    const txConfirmState = getTransactionConfirmState(
        {
            amount: linkedTx?.total != null ? Number(linkedTx.total) : null,
            date: linkedTx?.transactionTime ? new Date(linkedTx.transactionTime).toISOString().slice(0, 10) : null,
            counterparty: linkedTx?.senderName || null,
            name: linkedTx?.name || null,
            bommelId: linkedTx?.bommelId ?? null,
        },
        linkedBankTxns
    );
    const txMissingGroups = missingRequiredGroups(
        categoryGroups,
        linkedTx?.bommelId ?? null,
        buildBommelIndex(reviewAllBommels),
        Object.fromEntries(
            (linkedTx?.categoryValues ?? []).filter((c) => c.groupId != null && c.value != null).map((c) => [c.groupId as number, c.value as string])
        )
    );
    const canConfirmTx = txConfirmState.canConfirm && txMissingGroups.length === 0;
    const txConfirmBlockers = canConfirmTx ? null : (
        <>
            <span className="font-bold">{t('transactions.confirmBlockers.title')}</span>
            <span className="mt-0.5 block">
                {[...txConfirmState.missing.map((m) => t(`transactions.confirmBlockers.${m}`)), ...txMissingGroups.map((g) => g.name)].join(', ')}
            </span>
        </>
    );

    // Read view: the receipt's own values (what was reviewed), signed by direction.
    const docAmount = doc?.total != null ? Math.abs(Number(doc.total)) : null;
    const docIncome = doc?.direction === 'OUTGOING';
    const bommelName = doc?.bommelId != null ? reviewAllBommels.find((b) => b.id === doc.bommelId)?.name : undefined;
    const masterRows: [string, React.ReactNode][] = doc
        ? [
              [
                  t('receipts.review.amount'),
                  <span key="amount" className="tabular-nums font-extrabold" style={{ color: docIncome ? 'var(--positive)' : 'var(--negative)' }}>
                      {docAmount != null ? `${docIncome ? '+' : '–'} ${fmtCurrency(docAmount)}` : '—'}
                  </span>,
              ],
              ...(doc.totalTax != null
                  ? [
                        [
                            t('receipts.review.tax'),
                            <span key="tax" className="tabular-nums">
                                {fmtCurrency(Number(doc.totalTax))}
                            </span>,
                        ] as [string, React.ReactNode],
                    ]
                  : []),
              [t('receipts.review.receiptDate'), fmtDate(doc.transactionTime)],
              [docIncome ? t('receipts.review.recipient') : t('receipts.review.sender'), doc.senderName || '—'],
              [t('receipts.review.bommel'), bommelName ?? '—'],
              ...(linkedTx?.categoryValues ?? [])
                  .filter((c) => c.value)
                  .map((c): [string, React.ReactNode] => [
                      categoryGroups.find((g) => g.id === c.groupId)?.name ?? t('categoryGroups.fields.eyebrow'),
                      c.value ?? '—',
                  ]),
              [t('receipts.review.privatelyPaid'), doc.privatelyPaid ? t('transactions.detail.yes') : t('transactions.detail.no')],
          ]
        : [];

    // "Beleg" tab: facts about the file.
    const fileExt = doc?.fileName?.split('.').pop()?.toUpperCase();
    const fileRows: [string, React.ReactNode][] = doc
        ? [
              [t('receipts.review.fileName'), doc.fileName || '—'],
              [t('receipts.review.fileType'), fileExt || '—'],
              [t('receipts.review.fileSize'), doc.fileSize ? fmtFileSize(doc.fileSize, i18n.language) : '—'],
              [t('receipts.review.uploadedAt'), fmtDate(doc.createdAt)],
              ...(doc.uploadedBy ? [[t('receipts.review.uploadedBy'), doc.uploadedBy] as [string, React.ReactNode]] : []),
              [t('receipts.review.documentNumber'), doc.legalDocumentId || '—'],
              [
                  t('receipts.review.extraction'),
                  <Badge key="source" tone={doc.extractionSource ? EXTRACTION_TONE[doc.extractionSource] : 'neutral'}>
                      {t(`receipts.review.extractionSource.${doc.extractionSource ?? 'NONE'}`)}
                  </Badge>,
              ],
          ]
        : [];

    const canReanalyze = !locked && (status === 'failed' || status === 'ready' || status === 'skipped');

    return (
        <>
            <div
                className={cn('fixed inset-0 bg-black/25 z-40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
                onClick={tryClose}
            />
            {/* Large file preview to the left of the detail drawer (desktop only). pointer-events-none on the wrapper so
                clicks on the surrounding area fall through to the scrim and close the drawer. */}
            <div
                className={cn(
                    'hidden lg:flex fixed top-0 bottom-0 left-0 z-50 p-4 pointer-events-none transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ right: 'var(--drawer-w)', fontFamily: FONT }}
            >
                {doc && <DocumentFilePreview doc={doc} />}
            </div>
            <div
                className={cn(
                    'fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : 'translate-x-full'
                )}
                style={{ width: 'var(--drawer-w)', maxWidth: '94vw', background: 'var(--drawer-bg)', boxShadow: 'var(--shadow-lg)', fontFamily: FONT }}
            >
                {/* Header: eyebrow + file name, unsaved hint, close */}
                <div className="flex items-center justify-between gap-3 border-b border-border-soft px-6 py-5" style={{ background: 'var(--drawer-bg)' }}>
                    <div className="min-w-0">
                        <Eyebrow>{locked ? t('receipts.review.eyebrowView') : t('receipts.review.title')}</Eyebrow>
                        {doc && <h2 className="mt-1 truncate text-[19px] font-extrabold text-foreground">{doc.fileName}</h2>}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2.5">
                        {dirty && !locked && <span className="text-[11.5px] font-bold text-[var(--warning)]">{t('receipts.review.unsaved')}</span>}
                        <CloseButton onClick={tryClose} />
                    </div>
                </div>

                {!doc ? (
                    <div className="flex flex-1 items-center justify-center">
                        <LoadingState />
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Tabs: the transaction data (form or read view) and facts about the receipt file */}
                            <div className="mb-5 flex gap-0.5 rounded-xl p-1" style={{ background: 'var(--surface-track)' }}>
                                {(['transaction', 'receipt'] as const).map((tabKey) => (
                                    <button
                                        key={tabKey}
                                        type="button"
                                        onClick={() => setDetailTab(tabKey)}
                                        className={cn(
                                            'flex-1 rounded-[var(--btn-radius)] px-3 py-1.5 text-[13.5px] font-bold transition-colors',
                                            detailTab === tabKey
                                                ? 'bg-[var(--background-secondary)] text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {t(tabKey === 'transaction' ? 'receipts.review.tabTransaction' : 'receipts.review.tabReceipt')}
                                    </button>
                                ))}
                            </div>

                            {detailTab === 'transaction' && !locked && (
                                <div className="flex flex-col gap-4">
                                    {/* What the analysis did, in one line; details in the tooltip. */}
                                    {isAnalyzing && (
                                        <AnalysisNotice
                                            tone="neutral"
                                            icon={<Loader2 size={15} className="animate-spin" />}
                                            title={t('receipts.review.analyzing')}
                                            hint={t('receipts.review.analyzingHint')}
                                        />
                                    )}
                                    {status === 'ready' && (
                                        <AnalysisNotice
                                            tone="warn"
                                            icon={<Sparkles size={15} />}
                                            title={t('receipts.review.completed')}
                                            hint={t('receipts.review.completedHint')}
                                        />
                                    )}
                                    {(status === 'failed' || status === 'skipped') && (
                                        <AnalysisNotice
                                            tone="info"
                                            icon={<PencilLine size={15} />}
                                            title={
                                                status === 'skipped'
                                                    ? t('receipts.status.failed')
                                                    : serviceUnavailable
                                                      ? t('receipts.review.serviceUnavailableTitle')
                                                      : t('receipts.review.failedTitle')
                                            }
                                            hint={
                                                status === 'skipped'
                                                    ? t('receipts.status.hint.skipped')
                                                    : serviceUnavailable
                                                      ? t('receipts.review.serviceUnavailableHint')
                                                      : doc.analysisError || t('receipts.review.failedHint')
                                            }
                                        />
                                    )}
                                    {isBankReconcile && (
                                        <AnalysisNotice
                                            tone="neutral"
                                            icon={<Link2 size={15} />}
                                            title={t('receipts.review.bankReconcileTitle')}
                                            hint={t('receipts.review.bankReconcileHint')}
                                        />
                                    )}

                                    <DirectionCards
                                        value={direction === 'OUTGOING' ? 'income' : 'expense'}
                                        onChange={(id) => handleDirectionChange(id === 'income' ? 'OUTGOING' : 'INCOMING')}
                                        labels={{ expense: t('receipts.direction.incoming'), income: t('receipts.direction.outgoing') }}
                                        hints={{ expense: t('receipts.direction.incomingHint'), income: t('receipts.direction.outgoingHint') }}
                                        ariaLabel={t('receipts.direction.label')}
                                    />
                                    <Field label={t('receipts.review.name')}>
                                        <DrawerInput value={name} onChange={setName} loading={isAnalyzing && !name} />
                                    </Field>
                                    <div className="grid grid-cols-2 gap-3.5">
                                        <Field label={`${t('receipts.review.amount')} (€)`}>
                                            <DrawerInput value={amount} onChange={setAmount} inputMode="decimal" loading={isAnalyzing && !amount} />
                                        </Field>
                                        <Field label={t('receipts.review.date')}>
                                            <DrawerInput value={date} onChange={setDate} type="date" loading={isAnalyzing && !date} />
                                        </Field>
                                    </div>
                                    <Field label={senderLabel}>
                                        <DrawerInput value={senderName} onChange={setSenderName} loading={isAnalyzing && !senderName} />
                                    </Field>
                                    <Field label={t('receipts.review.bommel')}>
                                        <BommelSelect
                                            items={bommelItems}
                                            value={bommelId ? Number(bommelId) : ALL_BOMMELS}
                                            emptyLabel={t('invoiceUpload.selectBommel')}
                                            onChange={(next) => {
                                                const id = next === ALL_BOMMELS ? null : Number(next);
                                                // Remember the choice for the next receipt, like the upload form does.
                                                cacheBommelChoice(id);
                                                setBommelId(id ? String(id) : '');
                                            }}
                                            triggerClassName="sm:w-full rounded-xl border-border-soft shadow-none hover:shadow-none"
                                            matchTriggerWidth
                                        />
                                    </Field>

                                    {/* Privately paid */}
                                    <div
                                        className="flex items-center gap-3.5 rounded-[13px] border border-border-soft px-[15px] py-[13px]"
                                        style={{ background: 'var(--background-secondary)' }}
                                    >
                                        <label
                                            htmlFor="receipt-privately-paid"
                                            className="min-w-0 flex-1 cursor-pointer text-[13.5px] font-bold text-foreground"
                                        >
                                            {t('receipts.review.privatelyPaid')}
                                        </label>
                                        <BaseSwitch id="receipt-privately-paid" checked={privatelyPaid} onCheckedChange={setPrivatelyPaid} />
                                    </div>

                                    {/* Category groups belong to the transaction. Filtered by the chosen bommel; required ones
                                        must be filled before the receipt can be confirmed. For a receipt without transaction the
                                        values are sent along when it is confirmed. Draws its own divider and heading. */}
                                    {
                                        <CategoryGroupFields
                                            bommelId={bommelId ? Number(bommelId) : null}
                                            values={categoryValues}
                                            onChange={(groupId, value) => {
                                                setCategoryValues((prev) => {
                                                    const next = { ...prev };
                                                    if (value == null || value === '') delete next[groupId];
                                                    else next[groupId] = value;
                                                    return next;
                                                });
                                            }}
                                        />
                                    }

                                    {/* Bank matching. Needs a transaction; a privately paid receipt has no bank movement. */}
                                    {!privatelyPaid &&
                                        (isBankReconcile && linkedTx ? (
                                            <BankMatchSection tx={linkedTx} className="mt-2 border-t border-border-soft pt-6" />
                                        ) : (
                                            <div className="mt-2 border-t border-border-soft pt-6">
                                                <Eyebrow icon={<Link2 size={14} />} className="mb-[11px]">
                                                    {t('receipts.review.paymentMatching')}
                                                </Eyebrow>
                                                <div
                                                    className="flex items-start gap-3 rounded-[var(--r-card)] border px-4 py-3.5"
                                                    style={{
                                                        background: 'var(--info-surface)',
                                                        borderColor: 'color-mix(in oklch, var(--info) 25%, transparent)',
                                                    }}
                                                >
                                                    <Info size={18} className="mt-px flex-shrink-0 text-[var(--info)]" />
                                                    <p className="text-[13.5px] font-semibold leading-snug text-[var(--info)]">
                                                        {t('receipts.review.linkAfterCreate')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}

                            {detailTab === 'transaction' && locked && (
                                <div className="flex flex-col gap-6">
                                    {/* Head: direction tile, name, upload date */}
                                    <div className="flex items-center gap-3.5">
                                        <TxIcon size={44} incoming={docIncome} />
                                        <div className="min-w-0">
                                            <div className="truncate text-[16px] font-extrabold text-foreground">
                                                {doc.name || doc.senderName || doc.fileName}
                                            </div>
                                            <div className="mt-0.5 text-[12.5px] text-muted-foreground tabular-nums">
                                                {t('receipts.review.uploadedOn', { date: fmtDate(doc.createdAt) })}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <Eyebrow className="mb-[11px]">{t('receipts.review.masterData')}</Eyebrow>
                                        <InfoRows rows={masterRows} />
                                    </div>

                                    {/* The transaction created from this receipt */}
                                    <div>
                                        <Eyebrow icon={<Coins size={14} />} className="mb-[11px]">
                                            {t('receipts.review.createdTransaction')}
                                        </Eyebrow>
                                        {linkedTx ? (
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/transactions?id=${linkedTx.id}`)}
                                                className="flex w-full items-center gap-[13px] rounded-[var(--r-card)] px-4 py-3.5 text-left transition-shadow hover:ring-1 hover:ring-purple-300"
                                                style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}
                                            >
                                                <TxIcon size={40} incoming={Number(linkedTx.total ?? 0) >= 0} />
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-center gap-2">
                                                        <span className="truncate text-[14.5px] font-extrabold text-foreground">{linkedTx.name || '—'}</span>
                                                        <TxStatusBadge tx={linkedTx} />
                                                    </span>
                                                    <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                                                        {[linkedTx.senderName, fmtDate(linkedTx.transactionTime)].filter(Boolean).join(' · ')}
                                                    </span>
                                                </span>
                                                <span
                                                    className="flex-shrink-0 text-[15px] font-extrabold tabular-nums"
                                                    style={{ color: Number(linkedTx.total ?? 0) >= 0 ? 'var(--positive)' : 'var(--foreground)' }}
                                                >
                                                    {Number(linkedTx.total ?? 0) >= 0 ? '+ ' : '– '}
                                                    {fmtCurrency(Math.abs(Number(linkedTx.total ?? 0)))}
                                                </span>
                                                <ChevronRight size={17} className="flex-shrink-0 text-[var(--ink-faint)]" />
                                            </button>
                                        ) : hasLinkedTransaction ? (
                                            <LoadingState className="py-4" />
                                        ) : (
                                            <div
                                                className="rounded-[var(--r-card)] px-4 py-3.5 text-[13.5px] text-muted-foreground"
                                                style={{ background: 'var(--surface-sunken)' }}
                                            >
                                                {t('receipts.review.noTransaction')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Bank matching of the transaction; editable while it is not confirmed. */}
                                    {linkedTx && !linkedTx.privatelyPaid && <BankMatchSection tx={linkedTx} className="" />}
                                </div>
                            )}

                            {detailTab === 'receipt' && (
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <Eyebrow icon={<FileText size={14} />} className="mb-[11px]">
                                            {t('receipts.review.fileInfo')}
                                        </Eyebrow>
                                        <InfoRows rows={fileRows} />
                                    </div>

                                    {/* Values the analysis read from the file; while editing they can be applied field by field. Only
                                        shown while the analysis runs or when it actually recognized values. */}
                                    {(isAnalyzing || hasScannedValues) && (
                                        <div>
                                            <Eyebrow icon={<Sparkles size={14} />} className="mb-[11px]">
                                                {t('receipts.review.extractedValues')}
                                            </Eyebrow>
                                            {isAnalyzing && !receiptHasData ? (
                                                <div className="flex items-center gap-2.5 py-4 text-[13px] text-muted-foreground">
                                                    <Loader2 size={16} className="animate-spin text-purple-700" />
                                                    {t('receipts.review.analyzing')}
                                                </div>
                                            ) : hasScannedValues ? (
                                                <InfoRows
                                                    rows={(
                                                        [
                                                            [t('receipts.review.name'), aiName, !!aiName && aiName !== name, () => setName(aiName!)],
                                                            [
                                                                `${t('receipts.review.amount')} (€)`,
                                                                aiAmount ? fmtCurrency(Number(aiAmount)) : undefined,
                                                                !!aiAmount && aiAmount !== amount,
                                                                () => setAmount(aiAmount!),
                                                            ],
                                                            [
                                                                t('receipts.review.date'),
                                                                aiDate ? fmtDate(aiDate) : undefined,
                                                                !!aiDate && aiDate !== date,
                                                                () => setDate(aiDate!),
                                                            ],
                                                            [
                                                                senderLabel,
                                                                aiCounterparty,
                                                                !!aiCounterparty && aiCounterparty !== senderName,
                                                                () => setSenderName(aiCounterparty!),
                                                            ],
                                                        ] as [string, string | undefined, boolean, () => void][]
                                                    ).map(([label, value, differs, apply]): [string, React.ReactNode] => [
                                                        label,
                                                        <span key={label} className="inline-flex items-center gap-3">
                                                            <span>{value || '—'}</span>
                                                            {!locked && differs && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        apply();
                                                                    }}
                                                                    className="text-[12.5px] font-bold text-purple-700 hover:text-purple-900"
                                                                >
                                                                    {t('receipts.review.applySuggestion')}
                                                                </button>
                                                            )}
                                                        </span>,
                                                    ])}
                                                />
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-2.5 border-t border-border-soft px-6 py-4" style={{ background: 'var(--drawer-bg)' }}>
                            <BaseButton
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmDeleteOpen(true)}
                                disabled={deleteMutation.isPending}
                                aria-label={t('receipts.review.delete')}
                                title={t('receipts.review.delete')}
                                className="h-[42px] w-[42px] text-[var(--negative)] hover:bg-[var(--negative-surface)] hover:text-[var(--negative)]"
                            >
                                <Trash2 />
                            </BaseButton>
                            {canReanalyze && (
                                <BaseButton
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        doc.id && reanalyzeMutation.mutate(doc.id, { onSuccess: () => showInfo(t('receipts.toast.reanalyzeStarted')) })
                                    }
                                    disabled={reanalyzeMutation.isPending}
                                    aria-label={t('receipts.review.reanalyze')}
                                    title={t('receipts.review.reanalyze')}
                                    className="h-[42px] w-[42px] text-muted-foreground hover:bg-[var(--surface-sunken)] hover:text-foreground"
                                >
                                    <RefreshCw className={reanalyzeMutation.isPending ? 'animate-spin' : ''} />
                                </BaseButton>
                            )}
                            <div className="flex-1" />
                            {locked ? (
                                <>
                                    <BaseButton variant="tonal" onClick={onClose} className={footerBtn}>
                                        {t('common.close')}
                                    </BaseButton>
                                    {linkedTx?.status === 'DRAFT' && (
                                        <HintTooltip content={txConfirmBlockers}>
                                            <BaseButton
                                                variant="default"
                                                onClick={handleConfirmTransaction}
                                                disabled={confirmTransaction.isPending || !canConfirmTx}
                                                className={footerBtn}
                                            >
                                                <Check size={16} strokeWidth={2.5} />
                                                {confirmTransaction.isPending ? '…' : t('receipts.review.confirmTransaction')}
                                            </BaseButton>
                                        </HintTooltip>
                                    )}
                                </>
                            ) : (
                                <>
                                    <BaseButton variant="tonal" onClick={handleSave} disabled={busy} className={footerBtn}>
                                        {(updateMutation.isPending || updateTransaction.isPending) && !confirmMutation.isPending
                                            ? '…'
                                            : t('receipts.review.save')}
                                    </BaseButton>
                                    <HintTooltip
                                        content={
                                            formMissingGroups.length > 0 ? (
                                                <>
                                                    <span className="font-bold">{t('transactions.confirmBlockers.title')}</span>
                                                    <span className="mt-0.5 block">{formMissingGroups.map((g) => g.name).join(', ')}</span>
                                                </>
                                            ) : null
                                        }
                                    >
                                        <BaseButton
                                            variant="default"
                                            onClick={handleCreateTransaction}
                                            disabled={busy || formMissingGroups.length > 0}
                                            className={footerBtn}
                                        >
                                            <Check size={16} strokeWidth={2.5} />
                                            {confirmMutation.isPending
                                                ? '…'
                                                : isBankReconcile
                                                  ? t('receipts.review.confirmReceipt')
                                                  : t('receipts.review.createTransaction')}
                                        </BaseButton>
                                    </HintTooltip>
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

            <ConfirmDialog
                open={confirmDiscardOpen}
                onOpenChange={setConfirmDiscardOpen}
                title={t('receipts.review.discardTitle')}
                description={t('receipts.review.discardText')}
                confirmLabel={t('receipts.review.discardConfirm')}
                cancelLabel={t('receipts.review.keepEditing')}
                onConfirm={() => {
                    setConfirmDiscardOpen(false);
                    onClose();
                }}
                destructive
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
    const uploadMutation = useUploadDocument({ toastErrors: false });
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
    const bulkDelete = useDeleteDocument({ silent: true });

    const { data: allDocs, isLoading, refetch } = useDocuments();

    const docs = (allDocs ?? []) as DocumentResponse[];

    const queryClient = useQueryClient();
    const { showWarning, showInfo, showSuccess, showError } = useToast();
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
        showInfo(t('receipts.reanalyzeStarted', { count }));
    }

    async function handleReanalyzeAll() {
        const ids = reanalyzable.map((d) => d.id).filter((id): id is number => id != null);
        if (ids.length === 0) return;
        const count = await reanalyzeDocuments.mutateAsync(ids);
        showInfo(t('receipts.reanalyzeStarted', { count }));
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
        const results = await Promise.allSettled(ids.map((id) => bulkDelete.mutateAsync(id)));
        const failed = results.filter((r) => r.status === 'rejected').length;
        const done = results.length - failed;
        // One summary instead of a toast per receipt.
        if (failed === 0) showSuccess(t('receipts.toast.bulkDeleted', { count: done }));
        else if (done === 0) showError(t('receipts.toast.bulkDeleteFailed'));
        else showWarning(t('receipts.toast.bulkDeletePartial', { done, failed }));
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
