import { TransactionDisplayStatus, TransactionResponse } from '@hopps/api-client';
import { ChevronLeft, ChevronRight, X, Plus, Search, FileText, Trash2, Check, Minus, Filter, Wallet, Unlink } from 'lucide-react';
import { Fragment, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { CreateTransactionDrawer } from '@/components/BankAccounts/CreateTransactionDrawer';
import TransactionCategoryFilter, { type CategoryFilterRow } from '@/components/CategoryGroups/TransactionCategoryFilter';
import { ALL_BOMMELS, BommelSelect, BommelSelection } from '@/components/Dashboard/BommelSelect';
import { collectSubtreeIds, flattenBommelTree } from '@/components/Dashboard/bommelTree';
import { DeleteTransactionDialog } from '@/components/Receipts/DeleteTransactionDialog';
import { fmtCurrency, fmtDate } from '@/components/Transactions/format';
import { FONT, HIDE_BOMMEL_QUERY, TX_GRID, TX_GRID_GAP, TX_GRID_NARROW } from '@/components/Transactions/layout';
import { StatusBadge } from '@/components/Transactions/StatusBadge';
import { TransactionDrawer } from '@/components/Transactions/TransactionDrawer';
import { TableSkeleton } from '@/components/Transactions/TransactionsSkeleton';
import { TxIcon } from '@/components/Transactions/TxIcon';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { SortHeader } from '@/components/ui/SortHeader';
import { useCategoryGroups } from '@/hooks/queries/useCategoryGroups';
import { useDeleteDocument } from '@/hooks/queries/useDocuments';
import {
    useTransactions,
    useTransactionAggregate,
    useDeleteTransaction,
    TransactionFilters,
    TransactionSortBy,
    SortDirection,
} from '@/hooks/queries/useTransactions';
import { useMediaQuery } from '@/hooks/use-media-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePersistedState } from '@/hooks/usePersistedState';
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

// ─── Filter bar building blocks ──────────────────────────────────────────────

// Small heavy uppercase label above a filter control.
const FILTER_LABEL = 'text-[12px] font-extrabold uppercase tracking-[0.04em] text-[var(--ink-faint)]';

// Table column header text (static columns; the sortable ones use SortHeader's `klar` variant, which matches this).
const HEADER_CELL = {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--muted-foreground)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
} as const;

// The status segments. Independently toggleable; none selected means every row. Colour of the count badge while the
// segment is on, the same colours as the status badge in the rows.
const STATUS_SEGMENTS: { id: TransactionDisplayStatus; labelKey: string; color: string; tint: string }[] = [
    { id: 'DRAFT', labelKey: 'transactions.status.drafts', color: 'var(--info)', tint: 'var(--info-surface)' },
    { id: 'PARTIAL', labelKey: 'transactions.status.partial', color: 'var(--purple-700)', tint: 'var(--accent-surface)' },
    { id: 'LINKED', labelKey: 'transactions.status.linked', color: 'var(--warning)', tint: 'var(--warning-surface)' },
    { id: 'CONFIRMED', labelKey: 'transactions.status.confirmed', color: 'var(--positive)', tint: 'var(--positive-surface)' },
];

/** Removable badge for one active advanced filter. */
function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
    const { t } = useTranslation();
    return (
        <span
            className="inline-flex cursor-default items-center gap-2 rounded-[var(--btn-radius)] border py-1.5 pl-3 pr-2 text-[13px] font-semibold"
            style={{
                fontFamily: FONT,
                background: 'var(--accent-surface)',
                color: 'var(--purple-700)',
                borderColor: 'color-mix(in oklch, var(--primary) 28%, var(--background-secondary))',
            }}
        >
            {label}
            <button
                type="button"
                aria-label={t('transactions.filters.removeFilter')}
                onClick={onRemove}
                className="grid place-items-center transition-colors hover:text-[var(--negative)]"
            >
                <X size={14} strokeWidth={2.5} />
            </button>
        </span>
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
                columnGap: TX_GRID_GAP,
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
            <span className="flex items-center gap-3 min-w-0">
                <TxIcon size={36} incoming={incoming} />
                <span className="flex flex-col min-w-0">
                    <span className="font-bold text-[14px] text-foreground truncate leading-snug flex items-center gap-1.5">
                        <span className="truncate">{tx.name ?? '—'}</span>
                        {tx.documentId && <FileText size={13} className="text-purple-700 flex-shrink-0" />}
                    </span>
                    <span className="text-[12px] text-muted-foreground truncate leading-snug">{tx.senderName ?? ''}</span>
                </span>
            </span>

            {/* Category group values, joined. A transaction can carry one per group, and the column is far too
                narrow to list them, so the full set goes in the title. `truncate` only bites on a block box, and the
                grid item needs min-w-0 before it can shrink at all — without both the long names overflowed and
                pushed the later columns out of line. */}
            <span className="min-w-0">
                {categoryText && (
                    <span className="block truncate text-[13.5px] text-muted-foreground" title={categoryText}>
                        {categoryText}
                    </span>
                )}
            </span>

            {/* Bommel — stays empty when the transaction has none */}
            {!hideBommel && (
                <span className="min-w-0">
                    {tx.bommelName && (
                        <span className="block truncate text-[13.5px] text-muted-foreground" title={tx.bommelName}>
                            {tx.bommelName}
                        </span>
                    )}
                </span>
            )}

            {/* Date */}
            <span className="text-[13.5px] text-muted-foreground whitespace-nowrap tabular-nums">{fmtDate(tx.transactionTime)}</span>

            {/* Created at */}
            <span className="text-[13px] text-[var(--ink-faint)] whitespace-nowrap tabular-nums">{fmtDate(tx.createdAt)}</span>

            {/* Status. Whether bank movements back the transaction is part of it (Entwurf / Teilverknüpft / Verknüpft). */}
            <span className="flex items-center">
                <StatusBadge tx={tx} />
            </span>

            {/* Amount */}
            <span
                className="text-right font-bold tabular-nums whitespace-nowrap"
                style={{ fontSize: 14.5, color: incoming ? 'var(--positive)' : 'var(--negative)' }}
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
    const hideBommel = useMediaQuery(HIDE_BOMMEL_QUERY);

    const [search, setSearch] = usePersistedState<string>('hopps.transactions.search', '');
    // Selected status segments; empty means every status. The page always starts on the drafts, so this is not persisted
    // like the other filters.
    const [statusFilter, setStatusFilter] = useState<TransactionDisplayStatus[]>(['DRAFT']);
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
        displayStatuses: statusFilter.length > 0 ? statusFilter : undefined,
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
    const { data: countDraft } = useTransactionAggregate({ ...countFilters, displayStatuses: ['DRAFT'] });
    const { data: countPartial } = useTransactionAggregate({ ...countFilters, displayStatuses: ['PARTIAL'] });
    const { data: countLinked } = useTransactionAggregate({ ...countFilters, displayStatuses: ['LINKED'] });
    const { data: countConfirmed } = useTransactionAggregate({ ...countFilters, displayStatuses: ['CONFIRMED'] });
    const statusCounts: Record<TransactionDisplayStatus, number> = {
        DRAFT: countDraft?.count ?? 0,
        PARTIAL: countPartial?.count ?? 0,
        LINKED: countLinked?.count ?? 0,
        CONFIRMED: countConfirmed?.count ?? 0,
    };
    const toggleStatus = (id: TransactionDisplayStatus) => {
        setStatusFilter((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
        setPage(0);
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

    // Active filters of the advanced panel, one badge each. The search box and the status segments are visible controls
    // of their own and do not count.
    const activeFilters: { key: string; label: string; clear: () => void }[] = [];
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
    // ISO yyyy-mm-dd to dd.mm.yyyy without going through Date, so no time zone can shift the day.
    const isoToDe = (iso: string) => iso.split('-').reverse().join('.');
    if (startDate) activeFilters.push({ key: 'from', label: t('transactions.filters.fromDate', { date: isoToDe(startDate) }), clear: () => setStartDate('') });
    if (endDate) activeFilters.push({ key: 'to', label: t('transactions.filters.toDate', { date: isoToDe(endDate) }), clear: () => setEndDate('') });
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

    function resetAdvancedFilters() {
        setBommelIds([]);
        setStartDate('');
        setEndDate('');
        setPrivatelyPaid(false);
        setDetached(false);
        setCategoryFilterRows([]);
        setPage(0);
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    // Badge on the Filter button: how many of the panel's own filters are set.
    const advancedFilterCount = activeFilters.length;

    // Input/select base style
    const inputCls =
        'h-10 w-full rounded-xl border border-border-soft bg-[var(--background-secondary)] px-3.5 text-[14px] text-foreground transition-shadow focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-surface)]';

    return (
        <div className="flex flex-col w-full" style={{ fontFamily: FONT }}>
            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                    <h1 className="text-[27px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">{t('transactions.title')}</h1>
                    <p className="mt-1 text-[14.5px] text-muted-foreground">
                        {t('transactions.subtitle', {
                            count: totalCount,
                            income: fmtCurrency(totalIncome),
                            expense: fmtCurrency(totalExpense),
                        })}
                    </p>
                </div>
                <button
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex items-center gap-2 whitespace-nowrap bg-primary text-white font-bold shadow-[0_1px_2px_rgba(120,60,180,0.25)] transition-colors hover:bg-primary/90 active:translate-y-[0.5px]"
                    style={{
                        fontSize: 14.5,
                        padding: '11px 20px',
                        borderRadius: 'var(--btn-radius)',
                    }}
                >
                    <Plus size={17} strokeWidth={2.5} />
                    {t('transactions.new')}
                </button>
            </div>

            {/* ── Filter bar ── */}
            <div className="mb-3.5 flex flex-col gap-3.5">
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
                            className="h-11 w-full rounded-xl border border-border-soft bg-[var(--background-secondary)] pl-[38px] pr-3.5 text-[14.5px] text-foreground transition-shadow placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-surface)]"
                        />
                    </div>

                    {/* Status filter: independent toggles, no "all" segment — nothing selected shows every row. A hairline
                        between the segments reads as one filter group rather than a tab row. */}
                    <div
                        role="group"
                        aria-label={t('transactions.columns.status')}
                        className="inline-flex h-11 items-center gap-0.5 p-1"
                        style={{ background: 'var(--surface-track)', borderRadius: 12 }}
                    >
                        {STATUS_SEGMENTS.map((seg, index) => {
                            const on = statusFilter.includes(seg.id);
                            return (
                                <Fragment key={seg.id}>
                                    {index > 0 && (
                                        <span
                                            aria-hidden="true"
                                            className="mx-0.5 my-[7px] w-px self-stretch"
                                            style={{ background: 'color-mix(in oklch, var(--muted-foreground) 18%, transparent)' }}
                                        />
                                    )}
                                    <button
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => toggleStatus(seg.id)}
                                        className="inline-flex h-9 items-center gap-[7px] px-4 font-bold transition-colors"
                                        style={{
                                            fontSize: 13.5,
                                            borderRadius: 'var(--btn-radius)',
                                            color: on ? 'var(--foreground)' : 'var(--muted-foreground)',
                                            background: on ? 'var(--background-secondary)' : 'transparent',
                                            boxShadow: on ? 'var(--shadow-sm)' : 'none',
                                        }}
                                    >
                                        {t(seg.labelKey)}
                                        <span
                                            className="grid place-items-center rounded-full px-[5px] font-extrabold"
                                            style={{
                                                minWidth: 20,
                                                height: 20,
                                                fontSize: 11.5,
                                                background: on ? seg.tint : 'color-mix(in oklch, var(--surface-track) 60%, var(--background-secondary))',
                                                color: on ? seg.color : 'var(--muted-foreground)',
                                            }}
                                        >
                                            {statusCounts[seg.id]}
                                        </span>
                                    </button>
                                </Fragment>
                            );
                        })}
                    </div>

                    {/* Advanced filter toggle */}
                    <button
                        onClick={() => setAdvancedOpen((v) => !v)}
                        aria-expanded={advancedOpen}
                        className="inline-flex h-11 items-center gap-[7px] whitespace-nowrap font-semibold transition-colors"
                        style={{
                            fontSize: 13.5,
                            padding: '0 14px',
                            borderRadius: 'var(--btn-radius)',
                            border: '1px solid',
                            borderColor: advancedOpen ? 'transparent' : 'var(--border-soft)',
                            background: advancedOpen ? 'var(--purple-100)' : 'var(--background-secondary)',
                            color: advancedOpen ? 'var(--purple-700)' : 'var(--muted-foreground)',
                        }}
                    >
                        <Filter size={15} />
                        {t('transactions.filters.filter')}
                        {advancedFilterCount > 0 && ` · ${advancedFilterCount}`}
                    </button>
                </div>

                {/* Advanced filter panel. It has no footer of its own: the Filter button closes it. */}
                {advancedOpen && (
                    <div
                        className="flex flex-col gap-4 rounded-[var(--r-card)] border border-border-soft px-5 py-[18px]"
                        style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}
                    >
                        <div className="grid grid-cols-1 items-end gap-3.5 sm:grid-cols-[minmax(220px,2fr)_minmax(150px,1fr)_minmax(150px,1fr)]">
                            <div className="flex flex-col gap-[7px]">
                                <span className={FILTER_LABEL}>{t('transactions.filters.bommel')}</span>
                                <BommelSelect
                                    items={bommelItems}
                                    value={bommelSelection}
                                    onChange={onBommelSelectionChange}
                                    isLoading={bommelsLoading}
                                    triggerClassName="sm:w-full rounded-xl border-border-soft shadow-none hover:shadow-none"
                                />
                            </div>
                            <div className="flex flex-col gap-[7px]">
                                <span className={FILTER_LABEL}>{t('transactions.filters.from')}</span>
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
                            <div className="flex flex-col gap-[7px]">
                                <span className={FILTER_LABEL}>{t('transactions.filters.to')}</span>
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
                        </div>

                        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-3.5">
                            <div className="flex flex-col gap-[7px]">
                                <span className={FILTER_LABEL}>{t('transactions.filters.properties')}</span>
                                <div className="flex flex-wrap gap-2">
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
                                                borderRadius: 'var(--btn-radius)',
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
                    </div>
                )}

                {/* Active advanced filters. Shown whether or not the panel is open, so they can always be removed one by
                    one or all at once. */}
                {activeFilters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        {activeFilters.map((f) => (
                            <FilterBadge key={f.key} label={f.label} onRemove={f.clear} />
                        ))}
                        <BaseButton
                            variant="ghost"
                            size="sm"
                            onClick={resetAdvancedFilters}
                            className="rounded-[var(--btn-radius)] text-[13.5px] font-bold text-muted-foreground"
                        >
                            {t('transactions.filters.resetAll')}
                        </BaseButton>
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
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--btn-radius)] text-[13.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            style={{ background: 'var(--negative-solid)' }}
                        >
                            <Trash2 size={14} />
                            {t('transactions.bulk.delete')}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Table ── */}
            <div>
                {isLoading ? (
                    <TableSkeleton hideBommel={hideBommel} />
                ) : transactions.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center py-20 text-center rounded-[var(--r-card)] border border-border-soft"
                        style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-sm)' }}
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
                        className="rounded-[var(--r-card)] border border-border-soft overflow-hidden"
                        style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}
                    >
                        {/* Table header */}
                        <div
                            className="grid items-center border-b border-border-soft"
                            style={{
                                gridTemplateColumns: hideBommel ? TX_GRID_NARROW : TX_GRID,
                                columnGap: TX_GRID_GAP,
                                padding: '12px 20px',
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
                                t('transactions.columns.category'),
                                ...(hideBommel ? [] : [t('transactions.columns.bommel')]),
                            ].map((col) => (
                                <span key={col} style={HEADER_CELL}>
                                    {col}
                                </span>
                            ))}
                            <SortHeader
                                label={t('transactions.columns.date')}
                                active={sortBy === 'transactionTime'}
                                direction={sortDir}
                                onClick={() => handleSort('transactionTime')}
                                variant="klar"
                            />
                            <SortHeader
                                label={t('transactions.columns.createdAt')}
                                active={sortBy === 'createdAt'}
                                direction={sortDir}
                                onClick={() => handleSort('createdAt')}
                                variant="klar"
                            />
                            <span style={HEADER_CELL}>{t('transactions.columns.status')}</span>
                            <SortHeader
                                label={t('transactions.columns.amount')}
                                active={sortBy === 'total'}
                                direction={sortDir}
                                onClick={() => handleSort('total')}
                                align="right"
                                variant="klar"
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
                        className="w-9 h-9 flex items-center justify-center rounded-[var(--btn-radius)] border border-border-soft text-muted-foreground hover:text-foreground hover:border-purple-300 disabled:opacity-35 disabled:pointer-events-none transition-colors"
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
                        className="w-9 h-9 flex items-center justify-center rounded-[var(--btn-radius)] border border-border-soft text-muted-foreground hover:text-foreground hover:border-purple-300 disabled:opacity-35 disabled:pointer-events-none transition-colors"
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
