import { DocumentDirection, DocumentResponse, DocumentUpdateRequest, TransactionUpdateRequest } from '@hopps/api-client';
import { useQueryClient } from '@tanstack/react-query';
import {
    Upload,
    FileText,
    X,
    Trash2,
    Check,
    RefreshCw,
    ChevronRight,
    ChevronDown,
    Sparkles,
    AlertCircle,
    Clock,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    Coins,
    ExternalLink,
    Link2,
    Landmark,
    PencilLine,
} from 'lucide-react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { LoadingState } from '@/components/common/LoadingState';
import { DocumentFilePreview } from '@/components/Receipts/DocumentFilePreview';
import { BankMatchSection } from '@/components/Transactions/BankMatchSection';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SortHeader } from '@/components/ui/SortHeader';
import { useBankTransactionsForTransaction } from '@/hooks/queries/useBankAccounts';
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
import { useTransaction, useUpdateTransaction } from '@/hooks/queries/useTransactions';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { useDocumentEvents } from '@/hooks/useDocumentEvents';
import { cn } from '@/lib/utils';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

const FONT = '"Hanken Grotesk", "Reddit Sans", sans-serif';

// Shared column layout for the documents table header and rows (must stay in sync).
// Beleg | Datum | Erstellt am | Betrag | Status | Chevron
const DOC_GRID = 'minmax(0,2.3fr) 1fr 1fr 1fr 1.1fr 40px';

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

// ─── Status Badge ─────────────────────────────────────────────────────────────

type ReviewStatus = ReturnType<typeof getDocumentReviewStatus>;

function StatusBadge({ status }: { status: ReviewStatus }) {
    const { t } = useTranslation();

    const styles: Record<ReviewStatus, { bg: string; color: string; icon: React.ReactNode }> = {
        pending: { bg: '#F1F1F4', color: '#6B6B76', icon: <Clock size={11} /> },
        analyzing: { bg: '#EDF4FF', color: '#2563EB', icon: <Loader2 size={11} className="animate-spin" /> },
        ready: { bg: '#FBF1DD', color: '#B47C18', icon: <Sparkles size={11} /> },
        confirmed: { bg: '#E7F4EC', color: '#1F7A50', icon: <Check size={11} strokeWidth={2.5} /> },
        failed: { bg: '#F3EAFB', color: '#7E3FB4', icon: <PencilLine size={11} /> },
    };

    const s = styles[status];
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold whitespace-nowrap"
            style={{ background: s.bg, color: s.color, fontFamily: FONT }}
        >
            {s.icon}
            {t(`receipts.status.${status}`)}
        </span>
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
                            background: active ? bg : '#F8F8FA',
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
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[10px] border border-[#E9E9EE]" style={{ background: '#F8F8FA' }}>
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

function ReviewDrawer({ doc: docProp, onClose, onDeleted }: { doc: DocumentResponse | null; onClose: () => void; onDeleted: () => void }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const confirmMutation = useConfirmDocument();
    const updateMutation = useUpdateDocument();
    const deleteMutation = useDeleteDocument();
    const reanalyzeMutation = useReanalyzeDocument();
    const updateTransaction = useUpdateTransaction();
    const allBommels = useBommelsStore((s) => s.allBommels);
    const rootBommel = useBommelsStore((s) => s.rootBommel);

    // Live document — polls every 2s while the AI analysis is still running so results appear automatically
    const { data: liveDoc } = useDocument(docProp?.id);
    const doc = liveDoc ?? docProp;

    // When the receipt has a linked transaction (created from a bank transaction, or after confirming), the detail view
    // shows the transaction data (primary) and the analysed receipt data in a second tab. `hasLinkedTransaction` drives
    // the display; `isBankReconcile` (only while not yet confirmed) additionally allows editing/applying onto the
    // transaction.
    const linkedTransactionId = docProp?.transactionId ?? undefined;
    const hasLinkedTransaction = linkedTransactionId != null;
    const isBankReconcile = hasLinkedTransaction && docProp?.documentStatus !== 'CONFIRMED';
    const { data: linkedTx } = useTransaction(linkedTransactionId ?? 0);
    // The bank transaction(s) the linked transaction is matched to — shown for cross-checking the auto-filled values.
    const { data: linkedBankTxns = [] } = useBankTransactionsForTransaction(linkedTransactionId);

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [senderName, setSenderName] = useState('');
    const [bommelId, setBommelId] = useState('');
    const [privatelyPaid, setPrivatelyPaid] = useState(false);
    const [direction, setDirection] = useState<DocumentDirection>('INCOMING');
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
    const isConfirmed = status === 'confirmed';
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
            setBommelId(linkedTx.bommelId != null ? String(linkedTx.bommelId) : '');
            setPrivatelyPaid(linkedTx.privatelyPaid ?? false);
            setDirection(Number(linkedTx.total ?? 0) < 0 ? 'INCOMING' : 'OUTGOING');
            return;
        }

        initializedIdRef.current = docProp.id ?? null;
        setName(docProp.name ?? '');
        setAmount(docProp.total != null ? String(Math.abs(Number(docProp.total))) : '');
        setDate(docProp.transactionTime ? new Date(docProp.transactionTime).toISOString().slice(0, 10) : '');
        setSenderName(docProp.senderName ?? '');
        setBommelId(docProp.bommelId != null ? String(docProp.bommelId) : '');
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

    // A bommel must always be selected — default to the root bommel when none is set (also once the bommels finish
    // loading, since loading is asynchronous).
    useEffect(() => {
        if (open && !bommelId && rootBommel?.id != null) {
            setBommelId(String(rootBommel.id));
        }
    }, [open, bommelId, rootBommel]);

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
    // Whether the document analysis actually produced any usable data.
    const receiptHasData = !!(aiName || aiAmount || aiDate || aiSender);

    // For income ("Einnahme" = OUTGOING direction) the counterparty is the recipient, so the sender field
    // is labelled "Empfänger"; for an expense it stays "Aussteller".
    const senderLabel = direction === 'OUTGOING' ? t('receipts.review.recipient') : t('receipts.review.sender');

    function buildPayload() {
        const rawAmount = parseFloat(amount.replace(',', '.'));
        return new DocumentUpdateRequest({
            name: name || undefined,
            total: !isNaN(rawAmount) ? rawAmount : undefined,
            transactionDate: date || undefined,
            senderName: senderName || undefined,
            bommelId: bommelId ? Number(bommelId) : undefined,
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
            bommelId: bommelId ? Number(bommelId) : undefined,
            privatelyPaid,
        });
    }

    async function handleSave() {
        if (!doc?.id) return;
        if (isBankReconcile && doc.transactionId) {
            await updateTransaction.mutateAsync({ id: doc.transactionId, data: buildTransactionPayload() });
            onClose();
            return;
        }
        await updateMutation.mutateAsync({ id: doc.id, ...buildPayload() });
        onClose();
    }

    async function handleConfirm() {
        if (!doc?.id) return;
        if (isBankReconcile && doc.transactionId) {
            // Apply the reconciled values to the existing transaction, then mark the receipt reviewed.
            // confirm is idempotent for already-linked documents (it keeps the existing transaction).
            await updateTransaction.mutateAsync({ id: doc.transactionId, data: buildTransactionPayload() });
            await confirmMutation.mutateAsync(doc.id);
            onClose();
            return;
        }
        // Persist the current (possibly manually edited) values incl. direction before creating the transaction.
        await updateMutation.mutateAsync({ id: doc.id, ...buildPayload() });
        await confirmMutation.mutateAsync(doc.id);
        onClose();
    }

    async function handleDelete() {
        if (!doc?.id) return;
        await deleteMutation.mutateAsync(doc.id);
        setConfirmDeleteOpen(false);
        onDeleted();
        onClose();
    }

    const busy = updateMutation.isPending || confirmMutation.isPending || updateTransaction.isPending;
    const fieldsDisabled = isConfirmed || busy;

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
                style={{ width: 460, maxWidth: '100vw', background: '#FFFFFF', boxShadow: '0 12px 40px rgba(20,20,40,.16)', fontFamily: FONT }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#E9E9EE]">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#7E3FB4]">{t('receipts.review.title')}</span>
                        {doc && <p className="mt-0.5 text-[13px] text-[#6B6B76] truncate max-w-[300px]">{doc.fileName}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-[#E9E9EE] text-[#6B6B76] hover:text-[#1B1B1F] transition-colors"
                    >
                        <X size={17} />
                    </button>
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
                            <div className="px-6 py-3 border-b border-[#E9E9EE] flex flex-col gap-1.5" style={{ background: '#F8F8FA' }}>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={status} />
                                </div>
                                {(status === 'confirmed' || status === 'pending') && (
                                    <p className="text-[12px] text-[#6B6B76] leading-snug">{t(`receipts.statusDescription.${status}`)}</p>
                                )}
                            </div>

                            {/* File preview card */}
                            <div className="px-6 pt-5 pb-4">
                                <div className="flex items-center gap-3 p-4 rounded-[14px] border border-[#E9E9EE]" style={{ background: '#F8F8FA' }}>
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
                            {!isConfirmed && (isAnalyzing || status === 'ready' || status === 'failed') && (
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

                            {/* Link to the created transaction (only once confirmed) */}
                            {isConfirmed && doc.transactionId && (
                                <div className="px-6 pt-1">
                                    <button
                                        onClick={() => navigate(`/transactions?id=${doc.transactionId}`)}
                                        className="w-full flex items-center gap-3 p-3 rounded-[12px] border border-[#E9E9EE] text-left transition-colors hover:border-[#C7A2E3] hover:bg-[#F3EAFB]"
                                        style={{ background: '#F8F8FA' }}
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
                                        <div key={b.id} className="rounded-[12px] border border-[#E9E9EE] p-3.5" style={{ background: '#F8F8FA' }}>
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
                                        <DirectionToggle value={direction} onChange={setDirection} compact disabled={fieldsDisabled} />
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
                                        <select
                                            value={bommelId}
                                            onChange={(e) => setBommelId(e.target.value)}
                                            disabled={fieldsDisabled}
                                            className={FIELD_INPUT_CLS}
                                        >
                                            {allBommels.length === 0 && <option value={bommelId}>—</option>}
                                            {allBommels.map((b) => (
                                                <option key={b.id} value={b.id ?? ''}>
                                                    {(b as { name?: string }).name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPrivatelyPaid((v) => !v)}
                                        disabled={fieldsDisabled}
                                        className="w-full flex items-center gap-3 p-3 rounded-[10px] border transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                        style={{
                                            borderColor: privatelyPaid ? '#9955CC' : '#E9E9EE',
                                            background: privatelyPaid ? '#F3EAFB' : '#F8F8FA',
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
                                                value={aiSender ?? null}
                                                canApply={!fieldsDisabled && !!aiSender && aiSender !== senderName}
                                                onApply={() => setSenderName(aiSender!)}
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
                                            {(status === 'failed' || status === 'ready') && (
                                                <button
                                                    type="button"
                                                    onClick={() => doc.id && reanalyzeMutation.mutate(doc.id)}
                                                    disabled={reanalyzeMutation.isPending}
                                                    className="mt-1 flex items-center gap-1.5 py-2 px-4 rounded-full text-[13px] font-bold border border-[#E0E0E6] text-[#6B6B76] hover:bg-[#F8F8FA] transition-colors disabled:opacity-50"
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
                        <div className="px-6 py-4 border-t border-[#E9E9EE] flex flex-col gap-2" style={{ background: '#FFFFFF' }}>
                            {isConfirmed ? (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[13px] text-[#6B6B76]">{t('receipts.review.alreadyConfirmed')}</span>
                                    <button
                                        onClick={() => setConfirmDeleteOpen(true)}
                                        disabled={deleteMutation.isPending}
                                        className="py-2 px-4 rounded-full text-[13.5px] font-bold text-[#B12C4C] hover:bg-[#FBEAEF] transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={busy}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[14.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                        style={{ background: 'linear-gradient(100deg,#7E3FB4,#9955CC)', boxShadow: '0 4px 16px rgba(120,60,200,.22)' }}
                                    >
                                        <Check size={16} strokeWidth={2.5} />
                                        {confirmMutation.isPending ? '…' : t('receipts.review.confirm')}
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSave}
                                            disabled={busy}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[13.5px] font-bold border border-[#E0E0E6] text-[#6B6B76] hover:bg-[#F8F8FA] transition-colors disabled:opacity-50"
                                        >
                                            {updateMutation.isPending && !confirmMutation.isPending ? '…' : t('receipts.review.save')}
                                        </button>
                                        {(status === 'failed' || status === 'ready') && (
                                            <button
                                                onClick={() => doc.id && reanalyzeMutation.mutate(doc.id)}
                                                disabled={reanalyzeMutation.isPending}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[13.5px] font-bold border border-[#E0E0E6] text-[#6B6B76] hover:bg-[#F8F8FA] transition-colors disabled:opacity-50"
                                            >
                                                <RefreshCw size={13} className={reanalyzeMutation.isPending ? 'animate-spin' : ''} />
                                                {t('receipts.review.reanalyze')}
                                            </button>
                                        )}
                                        <button
                                            onClick={handleDelete}
                                            disabled={deleteMutation.isPending}
                                            className="py-2 px-4 rounded-full text-[13.5px] font-bold text-[#B12C4C] hover:bg-[#FBEAEF] transition-colors disabled:opacity-50"
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

function DocumentRow({ doc, onClick, selected }: { doc: DocumentResponse; onClick: () => void; selected: boolean }) {
    const status = getDocumentReviewStatus(doc);
    const amount = doc.total != null ? Number(doc.total) : null;
    const outgoing = doc.direction === 'OUTGOING';

    return (
        <button
            onClick={onClick}
            className="w-full grid items-center text-left border-b border-[#E9E9EE] last:border-b-0 transition-colors"
            style={{
                gridTemplateColumns: DOC_GRID,
                padding: '13px 20px',
                background: selected ? '#F3EAFB' : undefined,
                fontFamily: FONT,
            }}
            onMouseEnter={(e) => {
                if (!selected) (e.currentTarget as HTMLButtonElement).style.background = '#F8F8FA';
            }}
            onMouseLeave={(e) => {
                if (!selected) (e.currentTarget as HTMLButtonElement).style.background = '';
            }}
        >
            {/* Document name */}
            <span className="flex items-center gap-3 min-w-0 pr-4">
                <span className="w-9 h-9 flex items-center justify-center rounded-[10px] flex-shrink-0 text-base" style={{ background: '#F3EAFB' }}>
                    {fileIcon(doc.fileContentType)}
                </span>
                <span className="flex flex-col min-w-0">
                    <span className="font-bold text-[13.5px] text-[#1B1B1F] truncate leading-snug">{doc.name || doc.fileName || '—'}</span>
                    {doc.senderName && <span className="text-[12px] text-[#6B6B76] truncate leading-snug">{doc.senderName}</span>}
                </span>
            </span>

            {/* Date */}
            <span className="text-[13px] text-[#6B6B76] tabular-nums">{fmtDate(doc.transactionTime)}</span>

            {/* Created at */}
            <span className="text-[13px] text-[#9A9AA3] tabular-nums">{fmtDate(doc.createdAt)}</span>

            {/* Amount, signed by document direction */}
            <span className="font-bold tabular-nums text-[13.5px]" style={{ color: amount != null ? (outgoing ? '#1F7A50' : '#B12C4C') : '#9A9AA3' }}>
                {amount != null ? `${outgoing ? '+' : '−'}${fmtCurrency(Math.abs(amount))}` : '—'}
            </span>

            {/* Status */}
            <span>
                <StatusBadge status={status} />
            </span>

            {/* Arrow */}
            <span className="flex justify-end text-[#C0C0CC]">
                <ChevronRight size={16} />
            </span>
        </button>
    );
}

// ─── Upload Dropzone ──────────────────────────────────────────────────────────

// Largest receipt accepted for upload. Kept in sync with the backend limits (org service and the
// az-document-ai analysis service, both `quarkus.http.limits.max-body-size=10M`). Enforced client-side so
// oversized files get a clear message instead of a backend 413.
const MAX_UPLOAD_MB = 10;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

type UploadItem = { key: string; name: string; status: 'uploading' | 'done' | 'error' };

function UploadZone({ onUploaded }: { onUploaded: () => void }) {
    const { t } = useTranslation();
    const { showWarning } = useToast();
    const uploadMutation = useUploadDocument();
    const [analyze, setAnalyze] = useState(true);
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

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length === 0) return;
            const batch = acceptedFiles.map((file, i) => ({ key: `${Date.now()}-${i}-${file.name}`, file }));
            // Start a fresh batch: keep rows still uploading, drop finished/failed ones from earlier drops.
            setItems((prev) => [
                ...prev.filter((it) => it.status === 'uploading'),
                ...batch.map(({ key, file }) => ({ key, name: file.name, status: 'uploading' as const })),
            ]);

            // Each file goes up in its own request. As each one settles, its row flips to done/error and the document
            // list is refreshed right away — so results show up one by one instead of all at once at the end. One
            // failing upload does not abort the others. Direction is chosen later in the detail view, not at upload.
            batch.forEach(({ key, file }) => {
                uploadMutation
                    .mutateAsync({ file, analyze, direction: 'INCOMING' })
                    .then(() => {
                        setItems((prev) => prev.map((it) => (it.key === key ? { ...it, status: 'done' } : it)));
                        onUploaded();
                    })
                    .catch(() => {
                        setItems((prev) => prev.map((it) => (it.key === key ? { ...it, status: 'error' } : it)));
                    });
            });
        },
        [uploadMutation, analyze, onUploaded]
    );

    // Files the dropzone rejected (too large, or an unsupported type) never reach onDrop — surface a clear
    // warning so the upload doesn't just silently drop them.
    const onDropRejected = useCallback(
        (rejections: FileRejection[]) => {
            const tooLarge = rejections.filter((r) => r.errors.some((e) => e.code === 'file-too-large')).map((r) => r.file.name);
            const wrongType = rejections.filter((r) => r.errors.some((e) => e.code === 'file-invalid-type')).map((r) => r.file.name);
            if (tooLarge.length > 0) {
                showWarning(t('receipts.upload.tooLargeTitle'), {
                    description: t('receipts.upload.tooLargeDescription', { files: tooLarge.join(', '), max: MAX_UPLOAD_MB }),
                });
            }
            if (wrongType.length > 0) {
                showWarning(t('receipts.upload.invalidTypeTitle'), {
                    description: t('receipts.upload.invalidTypeDescription', { files: wrongType.join(', ') }),
                });
            }
        },
        [showWarning, t]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
        accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
        maxSize: MAX_UPLOAD_BYTES,
        multiple: true,
    });

    const isUploading = items.some((it) => it.status === 'uploading');
    const doneCount = items.filter((it) => it.status === 'done').length;

    return (
        <div
            className="rounded-[18px] border border-[#E9E9EE] px-5 py-4"
            style={{ background: '#FFFFFF', boxShadow: '0 1px 2px rgba(20,20,40,.05), 0 6px 22px rgba(20,20,40,.05)' }}
        >
            {/* Collapsible header — click to fold the whole upload area away so the receipt list has more room. */}
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
                    {collapsed && (
                        <span className="text-[12px] text-[#9A9AA3] truncate" style={{ fontFamily: FONT }}>
                            {isUploading ? t('receipts.upload.progress', { done: doneCount, total: items.length }) : t('receipts.upload.hint')}
                        </span>
                    )}
                </span>
                <ChevronDown size={18} className={cn('text-[#9A9AA3] transition-transform flex-shrink-0', collapsed ? '' : 'rotate-180')} />
            </button>

            {!collapsed && (
                <div className="mt-4">
                    <div
                        {...getRootProps()}
                        className={cn(
                            'flex flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed py-10 px-6 cursor-pointer transition-all',
                            isDragActive ? 'border-[#9955CC] bg-[#F3EAFB]' : 'border-[#E0E0E6] hover:border-[#C7A2E3] hover:bg-[#FAFAFA]'
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: isDragActive ? '#E0C8F5' : '#F3EAFB' }}>
                            {isUploading ? <Loader2 size={26} className="text-[#7E3FB4] animate-spin" /> : <Upload size={26} className="text-[#7E3FB4]" />}
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-[15px] text-[#1B1B1F]" style={{ fontFamily: FONT }}>
                                {isUploading
                                    ? t('receipts.upload.uploading')
                                    : isDragActive
                                      ? t('receipts.upload.dropzoneActive')
                                      : t('receipts.upload.dropzone')}
                            </p>
                            {!isUploading && (
                                <p className="mt-1 text-[13px] text-[#9A9AA3]" style={{ fontFamily: FONT }}>
                                    {t('receipts.upload.hint')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Per-file upload progress — updates row by row as each individual request settles. */}
                    {items.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                            {isUploading && (
                                <p className="px-1 text-[12px] font-semibold text-[#6B6B76]">
                                    {t('receipts.upload.progress', { done: doneCount, total: items.length })}
                                </p>
                            )}
                            {items.map((it) => {
                                const label = it.status === 'uploading' ? 'itemUploading' : it.status === 'done' ? 'itemDone' : 'itemError';
                                const color = it.status === 'error' ? '#B12C4C' : it.status === 'done' ? '#1F7A50' : '#9A9AA3';
                                return (
                                    <div
                                        key={it.key}
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-[#E9E9EE]"
                                        style={{ background: '#F8F8FA' }}
                                    >
                                        <span className="flex-shrink-0">
                                            {it.status === 'uploading' && <Loader2 size={15} className="text-[#7E3FB4] animate-spin" />}
                                            {it.status === 'done' && (
                                                <span
                                                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center"
                                                    style={{ background: '#E7F4EC' }}
                                                >
                                                    <Check size={12} strokeWidth={2.5} className="text-[#1F7A50]" />
                                                </span>
                                            )}
                                            {it.status === 'error' && <AlertCircle size={16} className="text-[#B12C4C]" />}
                                        </span>
                                        <span className="flex-1 min-w-0 truncate text-[13px] text-[#1B1B1F]">{it.name}</span>
                                        <span className="flex-shrink-0 text-[12px] font-semibold" style={{ color }}>
                                            {t(`receipts.upload.${label}`)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* AI analyze toggle */}
                    <button
                        type="button"
                        onClick={() => setAnalyze((v) => !v)}
                        className="mt-3 w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] border transition-all"
                        style={{
                            borderColor: analyze ? '#9955CC' : '#E9E9EE',
                            background: analyze ? '#F3EAFB' : '#F8F8FA',
                        }}
                    >
                        <span
                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                            style={{ background: analyze ? '#E0C8F5' : '#EBEBF0' }}
                        >
                            {analyze ? <Check size={14} strokeWidth={2.5} color="#7E3FB4" /> : <Sparkles size={14} color="#9A9AA3" />}
                        </span>
                        <span className="text-[13.5px] font-semibold" style={{ color: analyze ? '#7E3FB4' : '#6B6B76', fontFamily: FONT }}>
                            {t('receipts.upload.analyzeLabel')}
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function BelegeView() {
    const { t } = useTranslation();
    usePageTitle(t('receipts.title'));

    const [filter, setFilter] = useState<'unreviewed' | 'all' | 'confirmed'>('unreviewed');
    const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'transactionTime' | 'total'>('createdAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [selectedDoc, setSelectedDoc] = useState<DocumentResponse | null>(null);

    const { data: allDocs, isLoading, refetch } = useDocuments();

    const docs = (allDocs ?? []) as DocumentResponse[];

    const queryClient = useQueryClient();
    const { showWarning, showSuccess } = useToast();
    const reanalyzeDocuments = useReanalyzeDocuments();

    // Receipts that can be (re-)analyzed: previously failed or never analyzed. Drives both the button's
    // visibility and which documents the bulk action targets — already-analyzed receipts are left untouched.
    const reanalyzable = docs.filter(canReanalyzeDocument);

    async function handleReanalyzeAll() {
        const ids = reanalyzable.map((d) => d.id).filter((id): id is number => id != null);
        if (ids.length === 0) return;
        const count = await reanalyzeDocuments.mutateAsync(ids);
        showSuccess(t('receipts.reanalyzeStarted', { count }));
    }

    // Load the organization's bommels so the detail view's bommel select is populated.
    const { organization } = useStore();
    const bommelCount = useBommelsStore((s) => s.allBommels.length);
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

    // Open a specific document when navigated to with ?id= (e.g. from a linked transaction)
    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
        const idParam = searchParams.get('id');
        if (!idParam) return;
        const found = (allDocs as DocumentResponse[] | undefined)?.find((d) => d.id === Number(idParam));
        if (found) setSelectedDoc(found);
    }, [searchParams, allDocs]);

    const closeDrawer = () => {
        setSelectedDoc(null);
        if (searchParams.has('id')) {
            searchParams.delete('id');
            setSearchParams(searchParams, { replace: true });
        }
    };

    const filtered = docs.filter((doc) => {
        if (filter === 'unreviewed') return doc.documentStatus !== 'CONFIRMED';
        if (filter === 'confirmed') return doc.documentStatus === 'CONFIRMED';
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

    // Toggle sorting from a table column header: same column flips direction, new column starts descending.
    const handleSort = (field: typeof sortBy) => {
        if (sortBy === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(field);
            setSortDir('desc');
        }
    };

    const unreviewedCount = docs.filter((d) => d.documentStatus !== 'CONFIRMED').length;

    return (
        <div className="flex flex-col h-full min-h-0" style={{ fontFamily: FONT, background: '#F3F4F6' }}>
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
                <div className="flex items-center gap-1 flex-wrap">
                    {(['unreviewed', 'confirmed', 'all'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className="px-4 py-1.5 rounded-full font-bold transition-all"
                            style={{
                                fontSize: 13.5,
                                color: filter === f ? '#FFFFFF' : '#6B6B76',
                                background: filter === f ? 'linear-gradient(100deg,#7E3FB4,#9955CC)' : '#FFFFFF',
                                border: filter === f ? 'none' : '1px solid #E9E9EE',
                            }}
                        >
                            {t(`receipts.filter.${f}`)}
                            {f === 'unreviewed' && unreviewedCount > 0 && (
                                <span
                                    className="ml-1.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold"
                                    style={{ background: filter === f ? 'rgba(255,255,255,.25)' : '#F3EAFB', color: filter === f ? 'white' : '#7E3FB4' }}
                                >
                                    {unreviewedCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Only shown when there are receipts that can actually be re-analyzed (failed / not yet analyzed). */}
                {reanalyzable.length > 0 && (
                    <button
                        onClick={handleReanalyzeAll}
                        disabled={reanalyzeDocuments.isPending}
                        className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13.5px] font-bold border border-[#E0E0E6] text-[#7E3FB4] bg-white hover:bg-[#F3EAFB] hover:border-[#C7A2E3] transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={reanalyzeDocuments.isPending ? 'animate-spin' : ''} />
                        {t('receipts.reanalyzeAll')}
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: '#F3EAFB', color: '#7E3FB4' }}>
                            {reanalyzable.length}
                        </span>
                    </button>
                )}
            </div>

            {/* Document list */}
            <div className="flex-1 min-h-0 overflow-auto">
                {isLoading ? (
                    <LoadingState className="py-12" />
                ) : filtered.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center py-20 text-center rounded-[18px] border border-[#E9E9EE]"
                        style={{ background: '#FFFFFF' }}
                    >
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: '#F3EAFB' }}>
                            <FileText size={26} className="text-[#9955CC]" />
                        </div>
                        <p className="font-bold text-[#1B1B1F]" style={{ fontSize: 16 }}>
                            {filter === 'unreviewed' ? t('receipts.noUnreviewed') : t('transactions.noResults')}
                        </p>
                        <p className="mt-1 text-[13.5px] text-[#6B6B76]">
                            {filter === 'unreviewed' ? t('receipts.noUnreviewedDesc') : t('transactions.noResultsDesc')}
                        </p>
                    </div>
                ) : (
                    <div
                        className="rounded-[18px] border border-[#E9E9EE] overflow-hidden"
                        style={{ background: '#FFFFFF', boxShadow: '0 1px 2px rgba(20,20,40,.05), 0 6px 22px rgba(20,20,40,.05)' }}
                    >
                        {/* Table header */}
                        <div
                            className="grid items-center border-b border-[#E9E9EE]"
                            style={{
                                gridTemplateColumns: DOC_GRID,
                                padding: '10px 20px',
                                background: '#F8F8FA',
                                fontFamily: FONT,
                            }}
                        >
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#9A9AA3', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                {t('receipts.columns.document')}
                            </span>
                            <SortHeader
                                label={t('receipts.columns.date')}
                                active={sortBy === 'transactionTime'}
                                direction={sortDir}
                                onClick={() => handleSort('transactionTime')}
                            />
                            <SortHeader
                                label={t('receipts.columns.createdAt')}
                                active={sortBy === 'createdAt'}
                                direction={sortDir}
                                onClick={() => handleSort('createdAt')}
                            />
                            <SortHeader
                                label={t('receipts.columns.amount')}
                                active={sortBy === 'total'}
                                direction={sortDir}
                                onClick={() => handleSort('total')}
                            />
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#9A9AA3', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                {t('receipts.columns.status')}
                            </span>
                            <span />
                        </div>

                        {sorted.map((doc) => (
                            <DocumentRow key={doc.id} doc={doc} onClick={() => setSelectedDoc(doc)} selected={selectedDoc?.id === doc.id} />
                        ))}
                    </div>
                )}
            </div>

            {/* Review drawer */}
            <ReviewDrawer doc={selectedDoc} onClose={closeDrawer} onDeleted={closeDrawer} />
        </div>
    );
}
