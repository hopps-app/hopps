import { TransactionResponse } from '@hopps/api-client';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronUp, ExternalLink, FileText, Link2, Loader2, Receipt, Search, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { fmtDate } from '@/components/BankAccounts/format';
import { Badge, type BadgeTone } from '@/components/Transactions/StatusBadge';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import apiService from '@/services/ApiService';
import { parseAllocationAmount } from '@/utils/parseAmount';

const EPS = 0.005;
const round2 = (n: number) => Math.round(n * 100) / 100;
const DAY_MS = 86_400_000;
// A candidate gets the confidence pill from this score on (and only while not searching).
const STRONG_MATCH = 0.7;

// What a transaction still needs: its amount minus what other bank movements already cover.
const openOf = (t: TransactionResponse) => Math.max(0, Math.abs(t.total ?? 0) - Math.abs(t.coveredAmount ?? 0));

/**
 * Match quality between a candidate and the bank movement, 0..0.99: the closer the transaction's open amount is to the
 * movement's open rest, and the closer the dates, the higher.
 */
function matchScore(t: TransactionResponse, rest: number, bookingDate: Date | undefined): number {
    const delta = Math.abs(openOf(t) - rest);
    const days = t.transactionTime && bookingDate ? Math.abs(new Date(t.transactionTime).getTime() - new Date(bookingDate).getTime()) / DAY_MS : 60;
    return Math.max(0, Math.min(0.99, 1 - (delta / Math.max(rest, 1)) * 1.6 - Math.min(days, 60) / 260));
}

function Confidence({ value }: { value: number }) {
    const { t } = useTranslation();
    const tone: BadgeTone = value >= 0.9 ? 'pos' : value >= 0.75 ? 'warn' : 'neg';
    return (
        <Badge tone={tone}>
            <Sparkles size={12} />
            {t('konten.drawer.confidence', { pct: Math.round(value * 100) })}
        </Badge>
    );
}

interface Props {
    /** Signed amount of the bank movement; only transactions of the same direction are offered. */
    bankAmount: number;
    bookingDate?: Date;
    /** Magnitude of the bank movement still open. */
    rest: number;
    linkedIds: ReadonlySet<number>;
    pending: boolean;
    /** Links the transaction. `amount` is undefined when the backend's default allocation is what is wanted. */
    onLink: (transactionId: number, amount: number | undefined) => Promise<void>;
    /** The portion the current selection would assign (0 without a valid selection), for the summary preview. */
    onPreview: (amount: number) => void;
    onClose: () => void;
    /** Shows a candidate's receipt to the left of the drawer; the id currently shown is highlighted. */
    previewDocId: number | null;
    onTogglePreview: (documentId: number) => void;
}

/**
 * Inline picker for the open (unconfirmed) transactions that can cover a bank movement. Mirrors the bank movement picker
 * of the transaction drawer: a row is selected first, then the amount to use ("Teilbetrag", prefilled with what fits) is
 * confirmed with "Verknüpfen". Rows are sorted by match quality.
 */
export function TransactionMatchPicker({
    bankAmount,
    bookingDate,
    rest,
    linkedIds,
    pending,
    onLink,
    onPreview,
    onClose,
    previewDocId,
    onTogglePreview,
}: Props) {
    const { t } = useTranslation();
    const { format } = useCurrency();
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [useText, setUseText] = useState('');

    const { data: drafts = [], isFetching } = useQuery({
        queryKey: ['transactions', 'forMatch', 'drafts'],
        queryFn: () =>
            apiService.orgService.transactionsAll(
                undefined, // bommelId
                undefined, // categoryValue
                undefined, // detached
                undefined, // displayStatus
                undefined, // endDate
                0, // page
                undefined, // privatelyPaid
                undefined, // search
                200, // size
                undefined, // sortBy
                undefined, // sortDir
                undefined, // startDate
                'DRAFT' // status
            ),
    });

    const bankSign = Math.sign(bankAmount);
    const candidates = drafts
        .filter((tx) => tx.id != null && !linkedIds.has(tx.id) && (tx.total == null || tx.total === 0 || Math.sign(tx.total) === bankSign))
        .map((tx) => ({ tx, score: matchScore(tx, rest, bookingDate) }))
        .sort((a, b) => b.score - a.score);

    const needle = search.trim().toLowerCase().replace(/\s+/g, '');
    const list = needle
        ? candidates.filter(({ tx }) => [tx.name, tx.senderName, format(Math.abs(tx.total ?? 0))].join('|').toLowerCase().replace(/\s+/g, '').includes(needle))
        : candidates;

    const selected = candidates.find((c) => c.tx.id === selectedId)?.tx ?? null;
    const selectedAmount = Math.abs(selected?.total ?? 0);
    // The amount that fits: what the transaction still needs, capped by what is open on the movement. A transaction
    // without an amount yet takes the open rest.
    const fit = selected ? round2(selectedAmount > EPS ? Math.min(openOf(selected) || selectedAmount, rest) : rest) : 0;
    const typed = parseAllocationAmount(useText);
    const useValue = useText.trim() ? typed : fit;
    const useValid = selected != null && useValue != null && useValue > 0 && useValue <= fit + EPS;

    function select(tx: TransactionResponse) {
        if (tx.id == null) return;
        setUseText('');
        if (selectedId === tx.id) {
            setSelectedId(null);
            onPreview(0);
            return;
        }
        setSelectedId(tx.id);
        const nextFit = round2(Math.abs(tx.total ?? 0) > EPS ? Math.min(openOf(tx) || Math.abs(tx.total ?? 0), rest) : rest);
        onPreview(nextFit);
    }

    function changeUse(text: string) {
        setUseText(text);
        const v = text.trim() ? parseAllocationAmount(text) : fit;
        onPreview(v != null && v > 0 && v <= fit + EPS ? v : 0);
    }

    function changeSearch(text: string) {
        setSearch(text);
        setSelectedId(null);
        setUseText('');
        onPreview(0);
    }

    async function submit() {
        if (!selected?.id || !useValid || useValue == null) return;
        // The backend's default allocation is the transaction's amount capped by the movement. Only a different portion
        // is sent, as an explicit (manual) allocation; the default stays a plain link.
        const magnitude = Math.abs(bankAmount);
        const backendDefault = selectedAmount > EPS ? Math.min(selectedAmount, magnitude) : magnitude;
        await onLink(selected.id, Math.abs(useValue - backendDefault) <= EPS ? undefined : useValue);
    }

    return (
        <div
            className="overflow-hidden rounded-[var(--r-card)] border border-border-soft"
            style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}
        >
            {/* Search, clear and collapse */}
            <div className="flex items-center gap-2.5 border-b border-border-soft px-3.5 py-3">
                <Search size={16} className="flex-shrink-0 text-[var(--ink-faint)]" />
                <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={(e) => changeSearch(e.target.value)}
                    placeholder={t('konten.drawer.searchOpenTx', { count: candidates.length })}
                    className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => changeSearch('')}
                        aria-label={t('konten.drawer.clearSearch')}
                        className="grid p-[3px] text-[var(--ink-faint)] hover:text-foreground"
                    >
                        <X size={16} />
                    </button>
                )}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('common.collapse')}
                    className="grid border-l border-border-soft py-[3px] pl-2.5 pr-[3px] text-muted-foreground hover:text-foreground"
                >
                    <ChevronUp size={17} />
                </button>
            </div>

            <div className="max-h-[232px] overflow-y-auto">
                {isFetching && drafts.length === 0 ? (
                    <div className="flex items-center gap-2 px-3.5 py-4 text-[13px] text-muted-foreground">
                        <Loader2 size={14} className="animate-spin" />
                        {t('transactions.detail.bankLoading')}
                    </div>
                ) : list.length === 0 ? (
                    <p className="px-3.5 py-[22px] text-center text-[13px] text-muted-foreground">
                        {candidates.length ? t('konten.drawer.noSearchHit') : t('konten.drawer.noOpenTx')}
                    </p>
                ) : (
                    list.map(({ tx, score }) => {
                        const on = tx.id === selectedId;
                        return (
                            <div
                                key={tx.id}
                                onClick={() => select(tx)}
                                className={cn(
                                    'flex cursor-pointer items-center gap-[11px] border-b border-border-soft px-3.5 py-[11px] transition-colors last:border-b-0',
                                    on ? 'bg-[var(--accent-surface)]' : 'hover:bg-[var(--surface-sunken)]'
                                )}
                            >
                                <span
                                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[10px]"
                                    style={{ background: on ? 'var(--primary)' : 'var(--surface-track)', color: on ? '#fff' : 'var(--muted-foreground)' }}
                                >
                                    {on ? <Check size={16} strokeWidth={3} /> : <Receipt size={16} />}
                                </span>
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-[14px] font-bold text-foreground">{tx.name || '—'}</span>
                                    <span className="mt-px truncate text-[12px] text-muted-foreground">
                                        {fmtDate(tx.transactionTime)} · {tx.senderName || '—'}
                                    </span>
                                </span>
                                {!needle && score >= STRONG_MATCH && <Confidence value={score} />}
                                <span className="flex-shrink-0 whitespace-nowrap text-[14px] font-extrabold tabular-nums">
                                    {format(Math.abs(tx.total ?? 0))}
                                </span>
                                {/* Show the candidate's receipt next to the drawer; does not toggle the selection. */}
                                {tx.documentId != null && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTogglePreview(tx.documentId!);
                                        }}
                                        aria-pressed={previewDocId === tx.documentId}
                                        title={previewDocId === tx.documentId ? t('konten.drawer.hideReceipt') : t('konten.drawer.showReceipt')}
                                        className={cn(
                                            'grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border transition-colors',
                                            previewDocId === tx.documentId
                                                ? 'border-purple-300 bg-[var(--accent-surface)] text-purple-700'
                                                : 'border-border-soft text-muted-foreground hover:border-purple-300 hover:text-purple-700'
                                        )}
                                    >
                                        <FileText size={13} />
                                    </button>
                                )}
                                {/* Open the transaction in a new tab, so this assignment stays open. */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`/transactions?id=${tx.id}`, '_blank', 'noopener,noreferrer');
                                    }}
                                    title={t('konten.drawer.openTransactionNewTab')}
                                    className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border border-border-soft text-muted-foreground transition-colors hover:border-purple-300 hover:text-purple-700"
                                >
                                    <ExternalLink size={13} />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Amount to use for the selection, and link */}
            {selected && (
                <div className="flex items-center gap-3 border-t border-border-soft px-3.5 py-3" style={{ background: 'var(--surface-sunken)' }}>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[12.5px] font-semibold text-muted-foreground">{t('konten.drawer.partialAmount')}</span>
                            <span
                                className={cn(
                                    'flex h-[34px] items-center gap-[3px] rounded-[10px] border-[1.5px] bg-[var(--background-secondary)] px-2.5',
                                    useValid ? 'border-border-soft' : 'border-[var(--negative)]'
                                )}
                            >
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={useText}
                                    onChange={(e) => changeUse(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') submit();
                                    }}
                                    placeholder={fit.toFixed(2).replace('.', ',')}
                                    aria-label={t('konten.drawer.partialAmount')}
                                    aria-invalid={!useValid}
                                    className={cn(
                                        'w-[78px] bg-transparent text-right text-[14px] font-extrabold tabular-nums outline-none',
                                        useValid ? 'text-foreground' : 'text-[var(--negative)]'
                                    )}
                                />
                                <span className="text-[14px] font-extrabold text-muted-foreground">€</span>
                            </span>
                        </div>
                        {!useValid && (
                            <div className="mt-[7px] text-[12px] font-semibold text-[var(--negative)]">
                                {t('konten.drawer.partialAmountRange', { min: format(0.01), max: format(fit) })}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!useValid || pending}
                        className="inline-flex h-10 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--btn-radius)] bg-primary px-5 text-[14px] font-bold text-white transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                    >
                        {pending ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
                        {t('konten.drawer.link')}
                    </button>
                </div>
            )}
        </div>
    );
}
