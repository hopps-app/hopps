import { BankTransactionResponse } from '@hopps/api-client';
import { Check, ChevronUp, FileText, Landmark, Link2, Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { fmtCurrency, fmtDate } from '@/components/Transactions/format';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useBankTransactionSearch } from '@/hooks/queries/useBankAccounts';
import { cn } from '@/lib/utils';
import { parseAllocationAmount } from '@/utils/parseAmount';

// Float tolerance for amount comparisons.
const EPS = 0.005;

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmtInput = (n: number) => n.toFixed(2).replace('.', ',');

// A bank movement's amount. If it is already partially matched, the still-open amount is shown below it.
function BankTxAmount({ amount, matchedAmount }: { amount?: number; matchedAmount?: number }) {
    const { t } = useTranslation();
    const total = amount ?? 0;
    // matchedAmount is the SIGNED net coverage; the still-open amount is |total - matched|.
    const matched = matchedAmount ?? 0;
    const open = Math.abs(total - matched);
    const partiallyMatched = matched !== 0 && open > EPS;

    return (
        <span className="flex flex-shrink-0 flex-col items-end leading-tight">
            <span className="text-[14.5px] font-extrabold tabular-nums" style={{ color: total >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                {fmtCurrency(total)}
            </span>
            {partiallyMatched && (
                <span className="text-[11px] font-semibold tabular-nums text-[var(--warning)]">
                    {t('transactions.detail.openAmount', { amount: fmtCurrency(open) })}
                </span>
            )}
        </span>
    );
}

interface BankTransactionPickerProps {
    /** Signed amount of the transaction; 0 while it has none yet. */
    txTotal: number;
    /** Date of the transaction: movements booked on or shortly after it are preferred. */
    txDate?: Date | string | null;
    /** Magnitude still to be covered. 0 when nothing is open or the transaction has no amount yet. */
    open: number;
    /** Movements already linked to the transaction; they are left out of the list. */
    linkedIds: ReadonlySet<number | undefined>;
    pending: boolean;
    /** Links the movement. `amount` is undefined when the backend's default allocation is what is wanted. */
    onLink: (bankTxId: number, amount: number | undefined) => Promise<void>;
    /** The portion of the current selection that would be assigned (0 without a valid selection), for the summary. */
    onPreview: (amount: number) => void;
    onClose: () => void;
}

/**
 * Picker for the open bank movements of a transaction. A movement is selected first; the amount to use (prefilled with
 * what the transaction still needs) is then confirmed with "Verknüpfen". Exact matches are listed first.
 */
export function BankTransactionPicker({ txTotal, txDate, open, linkedIds, pending, onLink, onPreview, onClose }: BankTransactionPickerProps) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [useText, setUseText] = useState('');
    // The purpose ("Verwendungszweck") is often long, so it is hidden by default; the user can reveal it per row to check
    // the assignment (e.g. that the reference contains the invoice number). Tracks which rows are expanded.
    const [purposeShown, setPurposeShown] = useState<Set<number>>(new Set());

    const typed = search.trim();
    // Movements of exactly the open amount are fetched on their own, so they are in the list however many other open
    // movements there are (a single page holds only the newest ones).
    const openAmountStr = open > EPS ? fmtInput(open) : '';
    const { data: general, isFetching } = useBankTransactionSearch(typed, true);
    const { data: exact } = useBankTransactionSearch(openAmountStr, typed === '' && openAmountStr !== '');

    // Only movements running the same way as the transaction are offered: an expense is covered by outgoing movements
    // and an income by incoming ones, so a movement of the other direction could never cover it. While the transaction
    // has no amount yet its direction is unknown and every movement is offered.
    const txSign = Math.sign(txTotal);
    const sameDirection = (b: BankTransactionResponse) => txSign === 0 || Math.sign(b.amount ?? 0) === txSign;
    const refDate = txDate ? new Date(txDate).getTime() : null;
    // What is left of a movement that is already partially matched; the full amount otherwise.
    const availableOf = (b: BankTransactionResponse) => {
        const mag = Math.abs(b.amount ?? 0);
        const left = mag - Math.abs(b.matchedAmount ?? 0);
        return left > EPS ? left : mag;
    };

    const seen = new Set<number>();
    const candidates = [...(typed === '' ? (exact ?? []) : []), ...(general ?? [])]
        .filter((b) => {
            if (b.id == null || seen.has(b.id) || linkedIds.has(b.id) || !sameDirection(b)) return false;
            seen.add(b.id);
            return true;
        })
        .map((b) => {
            const d = b.bookingDate ? new Date(b.bookingDate).getTime() : null;
            const delta = d != null && refDate != null ? d - refDate : null;
            return {
                b,
                exactAmount: open > EPS && Math.abs(availableOf(b) - open) <= EPS ? 0 : 1,
                // On or after the transaction date first (the money usually leaves the account then), nearest first;
                // earlier ones follow; movements without a date go last.
                group: delta == null ? 2 : delta >= 0 ? 0 : 1,
                dist: delta == null ? 0 : Math.abs(delta),
            };
        })
        .sort((x, y) => x.exactAmount - y.exactAmount || x.group - y.group || x.dist - y.dist)
        .map((x) => x.b);

    const selected = candidates.find((b) => b.id === selectedId) ?? null;
    const selectedMag = Math.abs(selected?.amount ?? 0);
    const useValue = parseAllocationAmount(useText);
    // A match can use at most what the movement holds, and it must be positive.
    const useValid = selected != null && useValue != null && useValue > 0 && useValue <= selectedMag + EPS;

    // As much as the transaction still needs, capped by what the movement has left. Without an amount to cover (a
    // transaction whose amount is still to be filled, or one that is already covered) the whole movement.
    const defaultUse = (b: BankTransactionResponse) => round2(Math.min(open > EPS ? open : Math.abs(b.amount ?? 0), availableOf(b)));

    function select(b: BankTransactionResponse) {
        if (b.id == null) return;
        if (selectedId === b.id) {
            setSelectedId(null);
            onPreview(0);
            return;
        }
        const value = defaultUse(b);
        setSelectedId(b.id);
        setUseText(fmtInput(value));
        onPreview(value);
    }

    function changeUse(text: string) {
        setUseText(text);
        const v = parseAllocationAmount(text);
        onPreview(v != null && v > 0 && v <= selectedMag + EPS ? v : 0);
    }

    function changeSearch(text: string) {
        setSearch(text);
        // The list changes under the selection, so start over.
        setSelectedId(null);
        onPreview(0);
    }

    async function submit() {
        if (!selected?.id || !useValid || useValue == null) return;
        // The backend's default allocation is the transaction's amount capped by the movement. Only a different portion
        // is sent, as an explicit (manual) allocation; the default stays a plain link.
        const backendDefault = txTotal === 0 ? selectedMag : Math.min(Math.abs(txTotal), selectedMag);
        await onLink(selected.id, Math.abs(useValue - backendDefault) <= EPS ? undefined : Math.min(useValue, selectedMag));
    }

    const togglePurpose = (id: number) =>
        setPurposeShown((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });

    return (
        <div
            className="overflow-hidden rounded-[var(--r-card)] border border-border-soft"
            style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}
        >
            {/* Search over the open movements, with the collapse button */}
            <div className="flex items-stretch border-b border-border-soft">
                <label className="flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3.5">
                    <Search size={17} className="flex-shrink-0 text-[var(--ink-faint)]" />
                    <input
                        autoFocus
                        type="text"
                        value={search}
                        onChange={(e) => changeSearch(e.target.value)}
                        placeholder={t('transactions.detail.bankSearchOpen', { count: candidates.length })}
                        className="min-w-0 flex-1 bg-transparent text-[14.5px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
                    />
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
                {isFetching && candidates.length === 0 ? (
                    <div className="flex items-center gap-2 px-4 py-4 text-[13px] text-muted-foreground">
                        <Loader2 size={14} className="animate-spin" />
                        {t('transactions.detail.bankLoading')}
                    </div>
                ) : candidates.length === 0 ? (
                    <p className="px-4 py-4 text-center text-[13px] text-[var(--ink-faint)]">{t('transactions.detail.bankNoResults')}</p>
                ) : (
                    candidates.map((b) => {
                        const on = b.id === selectedId;
                        const showPurpose = b.id != null && purposeShown.has(b.id);
                        return (
                            <div key={b.id} className="border-b border-border-soft last:border-b-0">
                                <div
                                    className={cn(
                                        'flex items-center gap-2 pr-3 transition-colors',
                                        on ? 'bg-[var(--accent-surface)]' : 'hover:bg-[var(--surface-sunken)]'
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => select(b)}
                                        aria-pressed={on}
                                        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left"
                                    >
                                        <span
                                            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[var(--r-sm)]"
                                            style={{
                                                background: on ? 'var(--primary)' : 'var(--surface-track)',
                                                color: on ? '#fff' : 'var(--muted-foreground)',
                                            }}
                                        >
                                            {on ? <Check size={18} strokeWidth={3} /> : <Landmark size={17} />}
                                        </span>
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate text-[14.5px] font-bold text-foreground">{b.counterpartyName || b.purpose || '—'}</span>
                                            <span className="text-[12.5px] text-muted-foreground">
                                                {fmtDate(b.bookingDate)} · {b.bankAccountName ?? '—'}
                                            </span>
                                        </span>
                                        <BankTxAmount amount={b.amount} matchedAmount={b.matchedAmount} />
                                    </button>
                                    {b.purpose && (
                                        <button
                                            type="button"
                                            onClick={() => togglePurpose(b.id!)}
                                            aria-expanded={showPurpose}
                                            title={showPurpose ? t('transactions.detail.hidePurpose') : t('transactions.detail.showPurpose')}
                                            className={cn(
                                                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[var(--btn-radius)] border transition-colors',
                                                showPurpose
                                                    ? 'border-purple-300 bg-[var(--accent-surface)] text-purple-700'
                                                    : 'border-border-soft text-[var(--ink-faint)] hover:border-purple-300 hover:text-purple-700'
                                            )}
                                        >
                                            <FileText size={13} />
                                        </button>
                                    )}
                                </div>
                                {showPurpose && b.purpose && (
                                    <div className="px-4 pb-3">
                                        <p
                                            className="whitespace-pre-wrap break-words rounded-[8px] px-2.5 py-2 text-[12px] text-muted-foreground"
                                            style={{ background: 'var(--surface-sunken)' }}
                                        >
                                            <span className="font-semibold text-muted-foreground">{t('transactions.detail.purpose')}: </span>
                                            {b.purpose}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Confirm the selection: how much of the movement to use, and link */}
            {selected && (
                <div className="border-t border-border-soft px-4 py-3.5">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex flex-shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-muted-foreground">
                            {t('transactions.detail.partialAmountLabel')}
                            <InfoTooltip content={t('transactions.detail.partialAmountHint')} label={t('transactions.detail.partialAmountLabel')} />
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
                            <span className="text-[15px] font-extrabold text-muted-foreground">€</span>
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
                    {useValid && useValue != null && useValue < selectedMag - EPS && (
                        <div className="mt-1.5 text-[12.5px] tabular-nums text-muted-foreground">
                            {t('transactions.detail.partialAmountOf', { used: fmtCurrency(useValue), total: fmtCurrency(selectedMag) })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
