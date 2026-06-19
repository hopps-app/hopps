import { DocumentDirection, DocumentResponse, DocumentUpdateRequest } from '@hopps/api-client';
import { useQueryClient } from '@tanstack/react-query';
import {
    Upload,
    FileText,
    X,
    Trash2,
    Check,
    RefreshCw,
    ChevronRight,
    Sparkles,
    AlertCircle,
    Clock,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    Coins,
    ExternalLink,
} from 'lucide-react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { LoadingState } from '@/components/common/LoadingState';
import {
    useDocuments,
    useDocument,
    useUploadDocument,
    useConfirmDocument,
    useUpdateDocument,
    useDeleteDocument,
    useReanalyzeDocument,
    getDocumentReviewStatus,
    documentKeys,
} from '@/hooks/queries/useDocuments';
import { usePageTitle } from '@/hooks/use-page-title';
import { cn } from '@/lib/utils';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

const FONT = '"Hanken Grotesk", "Reddit Sans", sans-serif';

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
        failed: { bg: '#FBEAEF', color: '#B12C4C', icon: <AlertCircle size={11} /> },
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

// ─── Review Drawer ────────────────────────────────────────────────────────────

function ReviewDrawer({ doc: docProp, onClose, onDeleted }: { doc: DocumentResponse | null; onClose: () => void; onDeleted: () => void }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const confirmMutation = useConfirmDocument();
    const updateMutation = useUpdateDocument();
    const deleteMutation = useDeleteDocument();
    const reanalyzeMutation = useReanalyzeDocument();
    const allBommels = useBommelsStore((s) => s.allBommels);

    // Live document — polls every 2s while the AI analysis is still running so results appear automatically
    const { data: liveDoc } = useDocument(docProp?.id);
    const doc = liveDoc ?? docProp;

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [senderName, setSenderName] = useState('');
    const [bommelId, setBommelId] = useState('');
    const [privatelyPaid, setPrivatelyPaid] = useState(false);
    const [direction, setDirection] = useState<DocumentDirection>('INCOMING');

    const open = docProp !== null;
    const analysisStatus = doc?.analysisStatus;
    const isAnalyzing = analysisStatus === 'PENDING' || analysisStatus === 'ANALYZING';
    const status = doc ? getDocumentReviewStatus(doc) : 'pending';
    const isConfirmed = status === 'confirmed';

    // Initialize the form once per opened document (uses the list snapshot, which already holds
    // any previously extracted data for already-analyzed receipts).
    const initializedIdRef = useRef<number | null>(null);
    useEffect(() => {
        if (!docProp) {
            initializedIdRef.current = null;
            return;
        }
        if (initializedIdRef.current === docProp.id) return;
        initializedIdRef.current = docProp.id ?? null;
        setName(docProp.name ?? '');
        setAmount(docProp.total != null ? String(Math.abs(Number(docProp.total))) : '');
        setDate(docProp.transactionTime ? new Date(docProp.transactionTime).toISOString().slice(0, 10) : '');
        setSenderName(docProp.senderName ?? '');
        setBommelId(docProp.bommelId != null ? String(docProp.bommelId) : '');
        setPrivatelyPaid(docProp.privatelyPaid ?? false);
        setDirection(docProp.direction ?? 'INCOMING');
    }, [docProp]);

    // As the AI analysis streams in via polling, fill ONLY the fields the user has left empty.
    // Manually entered values are preserved (prev || value).
    useEffect(() => {
        if (!liveDoc || liveDoc.id !== initializedIdRef.current) return;
        if (liveDoc.name) setName((p) => p || liveDoc.name!);
        if (liveDoc.total != null) setAmount((p) => p || String(Math.abs(Number(liveDoc.total))));
        if (liveDoc.transactionTime) setDate((p) => p || new Date(liveDoc.transactionTime!).toISOString().slice(0, 10));
        if (liveDoc.senderName) setSenderName((p) => p || liveDoc.senderName!);
        if (liveDoc.bommelId != null) setBommelId((p) => p || String(liveDoc.bommelId));
    }, [liveDoc]);

    // Refresh the list once analysis finishes so the row's status/amount update too.
    const prevAnalyzingRef = useRef(false);
    useEffect(() => {
        if (prevAnalyzingRef.current && !isAnalyzing) {
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
        }
        prevAnalyzingRef.current = isAnalyzing;
    }, [isAnalyzing, queryClient]);

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

    async function handleSave() {
        if (!doc?.id) return;
        await updateMutation.mutateAsync({ id: doc.id, ...buildPayload() });
        onClose();
    }

    async function handleConfirm() {
        if (!doc?.id) return;
        // Persist the current (possibly manually edited) values incl. direction before creating the transaction.
        await updateMutation.mutateAsync({ id: doc.id, ...buildPayload() });
        await confirmMutation.mutateAsync(doc.id);
        onClose();
    }

    async function handleDelete() {
        if (!doc?.id) return;
        if (!window.confirm(t('receipts.deleteConfirm'))) return;
        await deleteMutation.mutateAsync(doc.id);
        onDeleted();
        onClose();
    }

    const busy = updateMutation.isPending || confirmMutation.isPending;
    const fieldsDisabled = isConfirmed || busy;

    return (
        <>
            <div
                className={cn('fixed inset-0 bg-black/25 z-40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
                onClick={onClose}
            />
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
                            {/* Status bar */}
                            <div className="px-6 py-3 border-b border-[#E9E9EE] flex items-center gap-2" style={{ background: '#F8F8FA' }}>
                                <StatusBadge status={status} />
                                {isConfirmed && <span className="text-[13px] text-[#6B6B76]">{t('receipts.review.alreadyConfirmed')}</span>}
                                {status === 'failed' && doc.analysisError && <span className="text-[12px] text-[#B12C4C] truncate">{doc.analysisError}</span>}
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
                                        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-[12px]" style={{ background: '#FBEAEF' }}>
                                            <AlertCircle size={16} className="text-[#B12C4C] flex-shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-[#B12C4C]">{t('receipts.review.failedTitle')}</p>
                                                <p className="text-[12px] text-[#B12C4C] opacity-80 leading-snug">
                                                    {doc.analysisError || t('receipts.review.failedHint')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
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

                            {/* Editable form */}
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
                                    label={t('receipts.review.sender')}
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
                                        <option value="">—</option>
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
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-[#E9E9EE] flex flex-col gap-2" style={{ background: '#FFFFFF' }}>
                            {isConfirmed ? (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[13px] text-[#6B6B76]">{t('receipts.review.alreadyConfirmed')}</span>
                                    <button
                                        onClick={handleDelete}
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
                gridTemplateColumns: 'minmax(0,2.5fr) 1fr 1fr 1.1fr 40px',
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

function UploadZone({ onUploaded }: { onUploaded: () => void }) {
    const { t } = useTranslation();
    const uploadMutation = useUploadDocument();
    const [analyze, setAnalyze] = useState(true);
    const [uploadingCount, setUploadingCount] = useState(0);

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            setUploadingCount(acceptedFiles.length);
            try {
                // Direction (Eingangs-/Ausgangsbeleg) is chosen later in the detail view, not at upload time.
                await Promise.all(acceptedFiles.map((file) => uploadMutation.mutateAsync({ file, analyze, direction: 'INCOMING' })));
                onUploaded();
            } finally {
                setUploadingCount(0);
            }
        },
        [uploadMutation, analyze, onUploaded]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
        multiple: true,
    });

    const isUploading = uploadingCount > 0;

    return (
        <div
            className="rounded-[18px] border border-[#E9E9EE] p-5"
            style={{ background: '#FFFFFF', boxShadow: '0 1px 2px rgba(20,20,40,.05), 0 6px 22px rgba(20,20,40,.05)' }}
        >
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
                        {isUploading ? t('receipts.upload.uploading') : isDragActive ? t('receipts.upload.dropzoneActive') : t('receipts.upload.dropzone')}
                    </p>
                    {!isUploading && (
                        <p className="mt-1 text-[13px] text-[#9A9AA3]" style={{ fontFamily: FONT }}>
                            {t('receipts.upload.hint')}
                        </p>
                    )}
                </div>
            </div>

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
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function BelegeView() {
    const { t } = useTranslation();
    usePageTitle(t('receipts.title'));

    const [filter, setFilter] = useState<'unreviewed' | 'all' | 'confirmed'>('unreviewed');
    const [selectedDoc, setSelectedDoc] = useState<DocumentResponse | null>(null);

    const { data: allDocs, isLoading, refetch } = useDocuments();

    const docs = (allDocs ?? []) as DocumentResponse[];

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

            {/* Filter tabs */}
            <div className="flex items-center gap-1 mb-3">
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
                                gridTemplateColumns: 'minmax(0,2.5fr) 1fr 1fr 1.1fr 40px',
                                padding: '10px 20px',
                                background: '#F8F8FA',
                            }}
                        >
                            {[t('receipts.columns.document'), t('receipts.columns.date'), t('receipts.columns.amount'), t('receipts.columns.status'), ''].map(
                                (col, i) => (
                                    <span
                                        key={i}
                                        style={{ fontSize: 11, fontWeight: 700, color: '#9A9AA3', textTransform: 'uppercase', letterSpacing: '0.07em' }}
                                    >
                                        {col}
                                    </span>
                                )
                            )}
                        </div>

                        {filtered.map((doc) => (
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
