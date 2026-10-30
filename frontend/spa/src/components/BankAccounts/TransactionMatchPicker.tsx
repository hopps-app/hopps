import { TransactionResponse } from '@hopps/api-client';
import { ChevronUp, Link2, Loader2, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CandidateActions, CandidateInfo } from '@/components/BankAccounts/MatchCandidateRow';
import { allocationFor, fitOf, useMatchCandidates } from '@/components/BankAccounts/useMatchCandidates';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import { parseAllocationAmount } from '@/utils/parseAmount';

const EPS = 0.005;
const fmtInput = (n: number) => n.toFixed(2).replace('.', ',');

interface Props {
    /** Signed amount of the bank movement; only transactions of the same direction are offered. */
    bankAmount: number;
    bookingDate?: Date;
    /** Magnitude of the bank movement still open. */
    rest: number;
    linkedIds: ReadonlySet<number>;
    pending: boolean;
    /** Links the transaction. `amount` is undefined when the backend's default allocation is what is wanted. */
    onLink: (tx: TransactionResponse, amount: number | undefined) => Promise<void>;
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
 * confirmed with "Verknüpfen" right in the selected row, so the action is where the user clicked instead of below a long
 * list. Rows are sorted by match quality.
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
    const { format, symbol } = useCurrency();
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [useText, setUseText] = useState('');
    // The amount field and link button of the selected row: brought into view on selection, also when the row is the
    // last visible one of the list or the list itself sits low in the drawer.
    const actionRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        // jsdom (tests) has no scrollIntoView.
        actionRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }, [selectedId]);

    const { candidates, list, searching, loading } = useMatchCandidates({ bankAmount, bookingDate, rest, linkedIds, search });

    const selected = list.find((c) => c.tx.id === selectedId)?.tx ?? null;
    const selectedAmount = Math.abs(selected?.total ?? 0);
    const fit = selected ? fitOf(selected, rest) : 0;
    const useValue = parseAllocationAmount(useText);
    const useValid = selected != null && useValue != null && useValue > 0 && useValue <= fit + EPS;

    function select(tx: TransactionResponse) {
        if (tx.id == null) return;
        if (selectedId === tx.id) {
            setSelectedId(null);
            onPreview(0);
            return;
        }
        const nextFit = fitOf(tx, rest);
        setSelectedId(tx.id);
        setUseText(fmtInput(nextFit));
        onPreview(nextFit);
    }

    function changeUse(text: string) {
        setUseText(text);
        const v = parseAllocationAmount(text);
        onPreview(v != null && v > 0 && v <= fit + EPS ? v : 0);
    }

    function changeSearch(text: string) {
        setSearch(text);
        // The list changes under the selection, so start over.
        setSelectedId(null);
        onPreview(0);
    }

    async function submit() {
        if (!selected?.id || !useValid || useValue == null) return;
        await onLink(selected, allocationFor(selected, useValue, bankAmount));
    }

    return (
        <div
            className="overflow-hidden rounded-[var(--r-card)] border border-border-soft"
            style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}
        >
            {/* Search over the open transactions, with clear and collapse */}
            <div className="flex items-stretch border-b border-border-soft">
                <label className="flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3.5">
                    <Search size={17} className="flex-shrink-0 text-[var(--ink-faint)]" />
                    <input
                        autoFocus
                        type="text"
                        value={search}
                        onChange={(e) => changeSearch(e.target.value)}
                        placeholder={t('konten.drawer.searchOpenTx', { count: candidates.length })}
                        className="min-w-0 flex-1 bg-transparent text-[14.5px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
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
                </label>
                <span aria-hidden="true" className="my-3 w-px bg-border-soft" />
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('common.collapse')}
                    className="grid w-14 flex-shrink-0 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ChevronUp size={18} />
                </button>
            </div>

            <div className="max-h-[272px] overflow-y-auto">
                {loading ? (
                    <div className="flex items-center gap-2 px-4 py-4 text-[13px] text-muted-foreground">
                        <Loader2 size={14} className="animate-spin" />
                        {t('transactions.detail.bankLoading')}
                    </div>
                ) : list.length === 0 ? (
                    <p className="px-4 py-4 text-center text-[13px] text-[var(--ink-faint)]">
                        {candidates.length ? t('konten.drawer.noSearchHit') : t('konten.drawer.noOpenTx')}
                    </p>
                ) : (
                    list.map(({ tx, score }) => {
                        const on = tx.id === selectedId;
                        return (
                            <div key={tx.id} className="border-b border-border-soft last:border-b-0">
                                <div
                                    className={cn(
                                        'flex items-center gap-2 pr-3 transition-colors',
                                        on ? 'bg-[var(--accent-surface)]' : 'hover:bg-[var(--surface-sunken)]'
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => select(tx)}
                                        aria-pressed={on}
                                        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left"
                                    >
                                        <CandidateInfo tx={tx} score={searching ? undefined : score} selected={on} />
                                    </button>
                                    {/* Receipt preview and new tab; neither toggles the selection. */}
                                    <CandidateActions tx={tx} previewDocId={previewDocId} onTogglePreview={onTogglePreview} />
                                </div>
                                {/* Confirm the selection: how much of the movement to use, and link */}
                                {on && (
                                    <div ref={actionRef} className="bg-[var(--accent-surface)] px-4 pb-3.5 pt-1">
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex flex-shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-muted-foreground">
                                                {t('transactions.detail.partialAmountLabel')}
                                                <InfoTooltip
                                                    content={t('transactions.detail.partialAmountHint')}
                                                    label={t('transactions.detail.partialAmountLabel')}
                                                />
                                            </span>
                                            <div
                                                className={cn(
                                                    'flex h-10 w-[132px] min-w-0 items-center gap-1.5 rounded-[12px] border bg-[var(--background-secondary)] px-3 transition-shadow focus-within:ring-[3px]',
                                                    useValid
                                                        ? 'border-border-soft focus-within:border-primary focus-within:ring-[var(--accent-surface)]'
                                                        : 'border-[var(--negative-border)] focus-within:ring-[var(--negative-surface)]'
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
                                                    aria-invalid={!useValid}
                                                    aria-label={t('transactions.detail.partialAmountLabel')}
                                                    className="min-w-0 flex-1 bg-transparent p-0 text-right text-[15px] font-extrabold tabular-nums outline-none"
                                                />
                                                <span className="text-[15px] font-extrabold text-muted-foreground">{symbol}</span>
                                            </div>
                                            <div className="flex-1" />
                                            <button
                                                type="button"
                                                onClick={submit}
                                                disabled={!useValid || pending}
                                                className="inline-flex h-10 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--btn-radius)] bg-primary px-5 text-[14.5px] font-bold text-white transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                                            >
                                                {pending ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                                                {t('transactions.detail.link')}
                                            </button>
                                        </div>
                                        {useValid && useValue != null && useValue < selectedAmount - EPS && (
                                            <div className="mt-1.5 text-[12.5px] tabular-nums text-muted-foreground">
                                                {t('transactions.detail.partialAmountOf', { used: format(useValue), total: format(selectedAmount) })}
                                            </div>
                                        )}
                                        {!useValid && (
                                            <div className="mt-1.5 text-[12.5px] font-semibold text-[var(--negative)]">
                                                {t('konten.drawer.partialAmountRange', { min: format(0.01), max: format(fit) })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
