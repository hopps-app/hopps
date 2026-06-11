import { TransactionResponse, TransactionStatus } from '@hopps/api-client';
import {
    ArrowDownRight,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    X,
    Plus,
    Search,
    FileText,
    Trash2,
    Pencil,
    Check,
    Download,
    Upload,
    SlidersHorizontal,
    Link2,
    Unlink,
    Coins,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { CreateTransactionDrawer } from '@/components/BankAccounts/CreateTransactionDrawer';
import { LoadingState } from '@/components/common/LoadingState';
import { usePageTitle } from '@/hooks/use-page-title';
import { useTransactions, useTransaction, useDeleteTransaction, TransactionFilters } from '@/hooks/queries/useTransactions';
import { useCategories } from '@/hooks/queries/useCategories';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { cn } from '@/lib/utils';

// ─── Design tokens (from prototype) ──────────────────────────────────────────
// bg: #F3F4F6 · surface: #FFFFFF · surface-2: #F8F8FA · surface-3: #F1F1F4
// ink: #1B1B1F · ink-2: #6B6B76 · ink-3: #9A9AA3
// line: #E9E9EE · pp: #9955CC · pp-ink: #7E3FB4 · pp-tint: #F3EAFB
// pos-bg: #E7F4EC · pos-ink: #1F7A50 · neg-bg: #FBEAEF · neg-ink: #B12C4C
// warn: #B47C18 · warn-bg: #FBF1DD
// font: "Hanken Grotesk"
// radius-card: 18px · radius-md: 14px · radius-sm: 10px

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FONT = '"Hanken Grotesk", "Reddit Sans", sans-serif';

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
        pos: 'bg-[#E7F4EC] text-[#1F7A50]',
        neg: 'bg-[#FBEAEF] text-[#B12C4C]',
        warn: 'bg-[#FBF1DD] text-[#B47C18]',
        neutral: 'bg-[#F1F1F4] text-[#6B6B76]',
        purple: 'bg-[#F3EAFB] text-[#7E3FB4]',
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
        <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#7E3FB4]" style={{ fontFamily: FONT }}>
            {children}
        </span>
    );
}

function StatusBadge({ status }: { status?: TransactionStatus }) {
    const { t } = useTranslation();
    if (status === 'CONFIRMED') {
        return <Badge variant="pos"><Check size={11} strokeWidth={2.5} />{t('transactions.status.confirmed')}</Badge>;
    }
    return <Badge variant="warn">{t('transactions.status.draft')}</Badge>;
}

function TxIcon({ size = 36, incoming }: { size?: number; incoming?: boolean }) {
    // Use purple tint for expense (outgoing), green tint for income
    const bg = incoming ? '#E7F4EC' : '#F3EAFB';
    const color = incoming ? '#1F7A50' : '#7E3FB4';
    const Icon = incoming ? ArrowUpRight : ArrowDownRight;
    return (
        <span
            className="inline-flex items-center justify-center flex-shrink-0"
            style={{ width: size, height: size, borderRadius: 10, background: bg, color }}
        >
            <Icon size={Math.round(size * 0.47)} strokeWidth={2} />
        </span>
    );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold border border-[#E0E0E6] bg-white text-[#6B6B76] cursor-default"
            style={{ fontFamily: FONT }}
        >
            {label}
            <button onClick={onRemove} className="text-[#9A9AA3] hover:text-[#1B1B1F] transition-colors">
                <X size={12} strokeWidth={2.5} />
            </button>
        </span>
    );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function TransactionDrawer({ txId, onClose, onDeleted }: { txId: number | null; onClose: () => void; onDeleted: () => void }) {
    const { t } = useTranslation();
    const { data: tx, isLoading } = useTransaction(txId ?? 0);
    const deleteMutation = useDeleteTransaction();
    const [editMode, setEditMode] = useState(false);
    const open = txId !== null;

    async function handleDelete() {
        if (!txId) return;
        if (!window.confirm(t('transactions.detail.delete') + '?')) return;
        await deleteMutation.mutateAsync(txId);
        onDeleted();
        onClose();
    }

    const amount = tx?.total ? Number(tx.total) : 0;

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn('fixed inset-0 bg-black/25 z-40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn('fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out', open ? 'translate-x-0' : 'translate-x-full')}
                style={{ width: 420, maxWidth: '100vw', background: '#FFFFFF', boxShadow: '0 12px 40px rgba(20,20,40,.16)', fontFamily: FONT }}
            >
                {/* Sticky header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#E9E9EE]" style={{ background: '#FFFFFF' }}>
                    <Eyebrow>{editMode ? t('transactions.detail.editTitle') : t('transactions.detail.title')}</Eyebrow>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-[#E9E9EE] text-[#6B6B76] hover:text-[#1B1B1F] hover:border-[#C7A2E3] transition-colors"
                    >
                        <X size={17} />
                    </button>
                </div>

                {isLoading || !tx ? (
                    <div className="flex-1 flex items-center justify-center">
                        <LoadingState />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        {/* Hero */}
                        <div className="px-6 pt-7 pb-6 flex flex-col items-center text-center border-b border-[#E9E9EE]">
                            <TxIcon size={52} incoming={amount >= 0} />
                            <h2 className="mt-4 font-bold text-[#1B1B1F] leading-snug" style={{ fontSize: 20 }}>
                                {tx.name ?? '—'}
                            </h2>
                            {tx.senderName && <p className="mt-1 text-[13.5px] text-[#6B6B76]">{tx.senderName}</p>}
                            <p
                                className="mt-4 font-bold tabular-nums leading-none"
                                style={{ fontSize: 38, color: amount >= 0 ? '#1F7A50' : '#B12C4C' }}
                            >
                                {fmtCurrency(amount)}
                            </p>
                            <div className="mt-3">
                                <StatusBadge status={tx.status} />
                            </div>
                        </div>

                        {/* Details */}
                        <div className="px-6 py-5 border-b border-[#E9E9EE]">
                            <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 12, columnGap: 16 }}>
                                {[
                                    [t('transactions.detail.category'), tx.categoryName ?? '—'],
                                    [t('transactions.detail.bommel'), tx.bommelName ?? '—'],
                                    [t('transactions.detail.area'), tx.area ?? '—'],
                                    [t('transactions.detail.date'), fmtDate(tx.transactionTime)],
                                    [t('transactions.detail.privatelyPaid'), tx.privatelyPaid ? t('transactions.detail.yes') : t('transactions.detail.no')],
                                ].map(([label, value]) => (
                                    <>
                                        <dt className="text-[13.5px] text-[#6B6B76]">{label}</dt>
                                        <dd className="text-[13.5px] font-semibold text-[#1B1B1F] text-right">{value}</dd>
                                    </>
                                ))}
                            </dl>
                        </div>

                        {/* Beleg */}
                        <div className="px-6 py-5 border-b border-[#E9E9EE]">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText size={15} className="text-[#7E3FB4]" />
                                <span className="text-[14px] font-bold text-[#1B1B1F]">{t('transactions.detail.receipt')}</span>
                            </div>
                            {tx.documentId ? (
                                <div
                                    className="flex items-center gap-3 p-3 rounded-[10px] border border-[#E9E9EE]"
                                    style={{ background: '#F8F8FA' }}
                                >
                                    <Badge variant="neutral">PDF</Badge>
                                    <span className="flex-1 text-[13px] text-[#1B1B1F] truncate">{t('transactions.detail.receipt')} #{tx.documentId}</span>
                                    <button className="w-8 h-8 flex items-center justify-center rounded-full border border-[#E9E9EE] text-[#6B6B76] hover:text-[#1B1B1F] transition-colors">
                                        <Download size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-[14px] border-2 border-dashed text-center"
                                    style={{ borderColor: '#E0E0E6' }}
                                >
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#F3EAFB' }}>
                                        <Upload size={20} className="text-[#7E3FB4]" />
                                    </div>
                                    <p className="text-[13px] text-[#6B6B76]">{t('transactions.detail.noReceipt')}</p>
                                </div>
                            )}
                        </div>

                        {/* Zahlung & Abgleich */}
                        <div className="px-6 py-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Link2 size={15} className="text-[#7E3FB4]" />
                                <span className="text-[14px] font-bold text-[#1B1B1F]">{t('transactions.detail.payment')}</span>
                            </div>
                            <div
                                className="flex items-start gap-3 p-3 rounded-[10px]"
                                style={{ background: '#F3EAFB' }}
                            >
                                <Unlink size={15} className="text-[#7E3FB4] mt-0.5 flex-shrink-0" />
                                <p className="text-[13px] text-[#7E3FB4] font-medium">{t('transactions.detail.notLinked')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sticky footer */}
                {tx && !isLoading && (
                    <div className="px-6 py-4 border-t border-[#E9E9EE] flex items-center gap-2" style={{ background: '#FFFFFF' }}>
                        <button
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-bold text-[#B12C4C] hover:bg-[#FBEAEF] transition-colors"
                        >
                            <Trash2 size={14} />
                            {t('transactions.detail.delete')}
                        </button>
                        <div className="flex-1" />
                        {!editMode && (
                            <button
                                onClick={() => setEditMode(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-bold border border-[#E0E0E6] text-[#1B1B1F] hover:bg-[#F8F8FA] transition-colors"
                            >
                                <Pencil size={14} />
                                {t('transactions.detail.edit')}
                            </button>
                        )}
                        {tx.status === 'DRAFT' && (
                            <button
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-bold text-white transition-all hover:opacity-90"
                                style={{ background: 'linear-gradient(100deg,#7E3FB4,#9955CC)' }}
                            >
                                <Check size={14} strokeWidth={2.5} />
                                {t('transactions.detail.confirm')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function TransactionRow({ tx, onClick, selected }: { tx: TransactionResponse; onClick: () => void; selected: boolean }) {
    const { t } = useTranslation();
    const amount = tx.total ? Number(tx.total) : 0;
    const incoming = amount >= 0;

    return (
        <button
            onClick={onClick}
            className={cn('w-full grid items-center text-left border-b border-[#E9E9EE] last:border-b-0 transition-colors')}
            style={{
                gridTemplateColumns: 'minmax(0,2.3fr) 1.3fr 1.2fr 0.9fr 1fr 1.1fr',
                padding: '14px 20px',
                background: selected ? '#F3EAFB' : undefined,
                fontFamily: FONT,
            }}
            onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = '#F8F8FA'; }}
            onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = ''; }}
        >
            {/* Transaktion */}
            <span className="flex items-center gap-3 min-w-0 pr-4">
                <TxIcon size={36} incoming={incoming} />
                <span className="flex flex-col min-w-0">
                    <span className="font-bold text-[14px] text-[#1B1B1F] truncate leading-snug flex items-center gap-1.5">
                        {tx.name ?? '—'}
                        {tx.documentId && <FileText size={13} className="text-[#7E3FB4] flex-shrink-0" />}
                    </span>
                    <span className="text-[12px] text-[#6B6B76] truncate leading-snug">{tx.senderName ?? ''}</span>
                </span>
            </span>

            {/* Category */}
            <span className="text-[13.5px] text-[#6B6B76] truncate pr-3">{tx.categoryName ?? '—'}</span>

            {/* Bommel */}
            <span className="pr-3">
                {tx.bommelName ? (
                    <span className="text-[13.5px] text-[#6B6B76] truncate">{tx.bommelName}</span>
                ) : (
                    <Badge variant="warn">{t('transactions.unassigned')}</Badge>
                )}
            </span>

            {/* Date */}
            <span className="text-[13.5px] text-[#6B6B76] whitespace-nowrap tabular-nums">{fmtDate(tx.transactionTime)}</span>

            {/* Status */}
            <span className="flex flex-col items-start gap-1">
                <StatusBadge status={tx.status} />
            </span>

            {/* Amount */}
            <span
                className="text-right font-bold tabular-nums whitespace-nowrap"
                style={{ fontSize: 14.5, color: incoming ? '#1F7A50' : '#B12C4C' }}
            >
                {incoming ? '+' : '–'} {fmtCurrency(Math.abs(amount))}
            </span>
        </button>
    );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function TransactionenView() {
    const { t } = useTranslation();
    usePageTitle(t('transactions.title'));

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'DRAFT'>('ALL');
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [categoryId, setCategoryId] = useState<number | undefined>();
    const [bommelId, setBommelId] = useState<number | undefined>();
    const [area, setArea] = useState<string | undefined>();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [privatelyPaid, setPrivatelyPaid] = useState(false);
    const [detached, setDetached] = useState(false);
    const [page, setPage] = useState(0);
    const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const PAGE_SIZE = 30;

    const filters: TransactionFilters = {
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as TransactionStatus),
        categoryId,
        bommelId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        privatelyPaid: privatelyPaid || undefined,
        detached: detached || undefined,
        page,
        size: PAGE_SIZE,
    };

    const { data: txData, isLoading } = useTransactions(filters);
    const { data: categoriesData } = useCategories();
    const allBommels = useBommelsStore((s) => s.allBommels);

    const transactions: TransactionResponse[] = useMemo(() => {
        if (!txData) return [];
        if (Array.isArray(txData)) return txData as TransactionResponse[];
        const r = txData as unknown as { content?: TransactionResponse[]; data?: TransactionResponse[] };
        return r.content ?? r.data ?? [];
    }, [txData]);

    const totalCount = useMemo(() => {
        if (!txData) return 0;
        if (Array.isArray(txData)) return (txData as TransactionResponse[]).length;
        const r = txData as unknown as { totalElements?: number; total?: number };
        return r.totalElements ?? r.total ?? transactions.length;
    }, [txData, transactions]);

    const totalIncome = transactions
        .filter((tx) => Number(tx.total ?? 0) >= 0)
        .reduce((s, tx) => s + Number(tx.total ?? 0), 0);
    const totalExpense = transactions
        .filter((tx) => Number(tx.total ?? 0) < 0)
        .reduce((s, tx) => s + Math.abs(Number(tx.total ?? 0)), 0);

    const activeFilters: { key: string; label: string; clear: () => void }[] = [];
    if (search) activeFilters.push({ key: 'search', label: `"${search}"`, clear: () => setSearch('') });
    if (categoryId) {
        const cat = (categoriesData as { id?: number; name?: string }[] | undefined)?.find((c) => c.id === categoryId);
        activeFilters.push({ key: 'cat', label: cat?.name ?? String(categoryId), clear: () => setCategoryId(undefined) });
    }
    if (bommelId) {
        const b = allBommels.find((b) => b.id === bommelId);
        activeFilters.push({ key: 'bommel', label: (b as { name?: string } | undefined)?.name ?? String(bommelId), clear: () => setBommelId(undefined) });
    }
    if (area) activeFilters.push({ key: 'area', label: area, clear: () => setArea(undefined) });
    if (startDate) activeFilters.push({ key: 'from', label: `${t('transactions.filters.from')}: ${startDate}`, clear: () => setStartDate('') });
    if (endDate) activeFilters.push({ key: 'to', label: `${t('transactions.filters.to')}: ${endDate}`, clear: () => setEndDate('') });
    if (privatelyPaid) activeFilters.push({ key: 'priv', label: t('transactions.filters.privatelyPaid'), clear: () => setPrivatelyPaid(false) });
    if (detached) activeFilters.push({ key: 'det', label: t('transactions.filters.detached'), clear: () => setDetached(false) });

    function resetAll() {
        setSearch(''); setStatusFilter('ALL'); setCategoryId(undefined); setBommelId(undefined);
        setArea(undefined); setStartDate(''); setEndDate(''); setPrivatelyPaid(false); setDetached(false); setPage(0);
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const hasFilters = activeFilters.length > 0 || statusFilter !== 'ALL';

    // Input/select base style
    const inputCls = 'rounded-[10px] border border-[#E9E9EE] bg-white px-3 py-1.5 text-[13.5px] text-[#1B1B1F] focus:outline-none focus:ring-2 focus:ring-[#F3EAFB] focus:border-[#9955CC] transition-colors';

    return (
        <div className="flex flex-col h-full min-h-0" style={{ fontFamily: FONT, background: '#F3F4F6' }}>

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                    <h1 className="font-bold text-[#1B1B1F] leading-tight" style={{ fontSize: 26 }}>
                        {t('transactions.title')}
                    </h1>
                    <p className="mt-1 text-[13.5px] text-[#6B6B76]">
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
                        background: 'linear-gradient(100deg,#7E3FB4,#9955CC)',
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
            <div
                className="rounded-[18px] border border-[#E9E9EE] p-4 mb-4 flex flex-col gap-3"
                style={{ background: '#FFFFFF', boxShadow: '0 1px 2px rgba(20,20,40,.05), 0 6px 22px rgba(20,20,40,.05)' }}
            >
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9AA3] pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                            placeholder={t('transactions.filters.search')}
                            className={cn(inputCls, 'w-full pl-9')}
                        />
                    </div>

                    {/* Status segmented toggle */}
                    <div
                        className="inline-flex p-1 gap-0.5"
                        style={{ background: '#F1F1F4', borderRadius: 12 }}
                    >
                        {(['ALL', 'CONFIRMED', 'DRAFT'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => { setStatusFilter(s); setPage(0); }}
                                className="px-3 py-1.5 font-bold transition-all"
                                style={{
                                    fontSize: 13.5,
                                    borderRadius: 9,
                                    color: statusFilter === s ? '#FFFFFF' : '#6B6B76',
                                    background: statusFilter === s ? 'linear-gradient(100deg,#7E3FB4,#9955CC)' : 'transparent',
                                    boxShadow: statusFilter === s ? '0 1px 2px rgba(20,20,40,.12)' : 'none',
                                }}
                            >
                                {t(`transactions.status.${s.toLowerCase()}`)}
                            </button>
                        ))}
                    </div>

                    {/* Advanced filter toggle */}
                    <button
                        onClick={() => setAdvancedOpen((v) => !v)}
                        className="inline-flex items-center gap-1.5 font-semibold transition-colors"
                        style={{
                            fontSize: 13.5,
                            padding: '8px 14px',
                            borderRadius: 999,
                            border: '1px solid',
                            borderColor: advancedOpen ? '#9955CC' : '#E0E0E6',
                            background: advancedOpen ? '#F3EAFB' : '#FFFFFF',
                            color: advancedOpen ? '#7E3FB4' : '#6B6B76',
                        }}
                    >
                        <SlidersHorizontal size={14} />
                        {t('transactions.filters.advancedFilters')}
                        {advancedOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {hasFilters && (
                        <button
                            onClick={resetAll}
                            className="text-[13px] font-semibold text-[#9A9AA3] hover:text-[#1B1B1F] transition-colors underline-offset-2 hover:underline"
                        >
                            {t('transactions.filters.reset')}
                        </button>
                    )}
                </div>

                {/* Advanced filter panel */}
                {advancedOpen && (
                    <div className="pt-3 border-t border-[#E9E9EE] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-[#9A9AA3] uppercase tracking-[0.06em]">{t('transactions.filters.category')}</label>
                            <select value={categoryId ?? ''} onChange={(e) => { setCategoryId(e.target.value ? Number(e.target.value) : undefined); setPage(0); }} className={inputCls}>
                                <option value="">{t('transactions.filters.allCategories')}</option>
                                {(categoriesData as { id?: number; name?: string }[] | undefined)?.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-[#9A9AA3] uppercase tracking-[0.06em]">{t('transactions.filters.bommel')}</label>
                            <select value={bommelId ?? ''} onChange={(e) => { setBommelId(e.target.value ? Number(e.target.value) : undefined); setPage(0); }} className={inputCls}>
                                <option value="">{t('transactions.filters.allBommels')}</option>
                                {allBommels.map((b) => (
                                    <option key={b.id} value={b.id ?? ''}>{(b as { name?: string }).name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-[#9A9AA3] uppercase tracking-[0.06em]">{t('transactions.filters.area')}</label>
                            <select value={area ?? ''} onChange={(e) => { setArea(e.target.value || undefined); setPage(0); }} className={inputCls}>
                                <option value="">{t('transactions.filters.allAreas')}</option>
                                <option value="IDEAL">Ideell</option>
                                <option value="ZWECKBETRIEB">Zweckbetrieb</option>
                                <option value="WIRTSCHAFTLICHER_GESCHAEFTSBETRIEB">Wirtsch. Geschäftsbetrieb</option>
                                <option value="VERMOEGENSVERWALTUNG">Vermögensverwaltung</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-[#9A9AA3] uppercase tracking-[0.06em]">{t('transactions.filters.from')}</label>
                            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(0); }} className={inputCls} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-[#9A9AA3] uppercase tracking-[0.06em]">{t('transactions.filters.to')}</label>
                            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(0); }} className={inputCls} />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[11px] font-bold text-[#9A9AA3] uppercase tracking-[0.06em]">Eigenschaften</label>
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { key: 'priv', label: t('transactions.filters.privatelyPaid'), active: privatelyPaid, toggle: () => { setPrivatelyPaid((v) => !v); setPage(0); } },
                                    { key: 'det', label: t('transactions.filters.detached'), active: detached, toggle: () => { setDetached((v) => !v); setPage(0); } },
                                ].map(({ key, label, active, toggle }) => (
                                    <button
                                        key={key}
                                        onClick={toggle}
                                        className="inline-flex items-center gap-1.5 font-semibold transition-all"
                                        style={{
                                            fontSize: 13.5,
                                            padding: '7px 14px',
                                            borderRadius: 999,
                                            border: '1px solid',
                                            borderColor: active ? '#9955CC' : '#E0E0E6',
                                            background: active ? '#F3EAFB' : '#FFFFFF',
                                            color: active ? '#7E3FB4' : '#6B6B76',
                                        }}
                                    >
                                        {active && <Check size={12} strokeWidth={2.5} />}
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Active filter chips */}
                {activeFilters.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                        {activeFilters.map((f) => (
                            <FilterChip key={f.key} label={f.label} onRemove={f.clear} />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Table ── */}
            <div className="flex-1 min-h-0 overflow-auto">
                {isLoading ? (
                    <LoadingState className="py-12" />
                ) : transactions.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center py-20 text-center rounded-[18px] border border-[#E9E9EE]"
                        style={{ background: '#FFFFFF', boxShadow: '0 1px 2px rgba(20,20,40,.05)' }}
                    >
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: '#F3EAFB' }}>
                            <FileText size={26} className="text-[#9955CC]" />
                        </div>
                        <p className="font-bold text-[#1B1B1F]" style={{ fontSize: 16 }}>{t('transactions.noResults')}</p>
                        <p className="mt-1 text-[13.5px] text-[#6B6B76]">{t('transactions.noResultsDesc')}</p>
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
                                gridTemplateColumns: 'minmax(0,2.3fr) 1.3fr 1.2fr 0.9fr 1fr 1.1fr',
                                padding: '11px 20px',
                                background: '#F8F8FA',
                                fontFamily: FONT,
                            }}
                        >
                            {[
                                t('transactions.columns.transaction'),
                                t('transactions.columns.category'),
                                t('transactions.columns.bommel'),
                                t('transactions.columns.date'),
                                t('transactions.columns.status'),
                                t('transactions.columns.amount'),
                            ].map((col, i) => (
                                <span
                                    key={col}
                                    className={cn(i === 5 ? 'text-right' : '')}
                                    style={{ fontSize: 11, fontWeight: 700, color: '#9A9AA3', textTransform: 'uppercase', letterSpacing: '0.07em' }}
                                >
                                    {col}
                                </span>
                            ))}
                        </div>

                        {transactions.map((tx) => (
                            <TransactionRow
                                key={tx.id}
                                tx={tx}
                                onClick={() => setSelectedTxId(tx.id ?? null)}
                                selected={selectedTxId === tx.id}
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
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-[#E9E9EE] text-[#6B6B76] hover:text-[#1B1B1F] hover:border-[#C7A2E3] disabled:opacity-35 disabled:pointer-events-none transition-colors"
                        style={{ background: '#FFFFFF' }}
                    >
                        <ChevronLeft size={17} />
                    </button>
                    <span className="text-[13.5px] font-semibold text-[#6B6B76]">
                        {page + 1} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-[#E9E9EE] text-[#6B6B76] hover:text-[#1B1B1F] hover:border-[#C7A2E3] disabled:opacity-35 disabled:pointer-events-none transition-colors"
                        style={{ background: '#FFFFFF' }}
                    >
                        <ChevronRight size={17} />
                    </button>
                </div>
            )}

            {/* Detail drawer */}
            <TransactionDrawer
                txId={selectedTxId}
                onClose={() => setSelectedTxId(null)}
                onDeleted={() => setSelectedTxId(null)}
            />

            {/* Create transaction drawer */}
            <CreateTransactionDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
        </div>
    );
}
