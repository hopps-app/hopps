import { BankTransactionResponse, TransactionResponse } from '@hopps/api-client';
import { Link2, ExternalLink, Landmark, Loader2, Unlink } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BankTransactionPicker } from '@/components/Transactions/BankTransactionPicker';
import { Eyebrow } from '@/components/Transactions/Eyebrow';
import { fmtCurrency, fmtDate } from '@/components/Transactions/format';
import { MatchAllocationControl } from '@/components/Transactions/MatchAllocationControl';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
    useBankTransactionsForTransaction,
    useAddBankTransactionMatch,
    useRemoveBankTransactionMatch,
    useUpdateBankTransactionMatchAmount,
} from '@/hooks/queries/useBankAccounts';
import { useReopenTransaction } from '@/hooks/queries/useTransactions';
import { cn } from '@/lib/utils';

// Round icon button used on the linked-movement cards.
const ICON_BTN =
    'grid h-10 w-10 flex-shrink-0 place-items-center rounded-[var(--btn-radius)] border border-border-soft bg-[var(--background-secondary)] text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground';

/**
 * Reconciliation section for linking bank transactions to a transaction record. Shared between the transaction
 * detail drawer and the receipt review drawer so bank transactions can be assigned in either place.
 */
export function BankMatchSection({
    tx,
    currentTotal,
    className = 'px-6 py-5',
}: {
    tx: TransactionResponse;
    currentTotal?: number | null;
    /** Spacing of the section wrapper; the transaction drawer places it itself. */
    className?: string;
}) {
    const { t } = useTranslation();
    const { data: linked, isLoading } = useBankTransactionsForTransaction(tx.id);
    const addMatch = useAddBankTransactionMatch();
    const removeMatch = useRemoveBankTransactionMatch();
    const updateMatchAmount = useUpdateBankTransactionMatchAmount();
    const reopenMutation = useReopenTransaction();

    // A bank match whose removal would leave a *confirmed* transaction no longer fully covered — pending user
    // confirmation, because unlinking it also reopens the transaction (back to draft).
    const [unlinkPending, setUnlinkPending] = useState<BankTransactionResponse | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    // Portion of the movement currently selected in the picker (0 without a selection), previewed in the summary tile.
    const [preview, setPreview] = useState(0);
    const linkedIds = new Set((linked ?? []).map((b) => b.id));

    // Amount reconciliation from the transaction's side — the mirror of the bank-transaction drawer: how much of this
    // transaction's total is already covered by linked bank movements, and how much still needs to be assigned. Signed
    // like the bank side (expense negative on both sides), so remaining = transaction total − sum of linked amounts.
    // In the edit form the amount/direction can change before saving; currentTotal (when provided) feeds the live
    // signed value so the reconciliation flips immediately when income↔expense is toggled. Falls back to the saved total.
    const txTotal = currentTotal !== undefined ? (currentTotal ?? 0) : tx.total != null ? Number(tx.total) : 0;
    // Direction of THIS transaction (income +, expense −). Allocations are signed to it — not to the bank movement's
    // direction — because this is the transaction's side of the reconciliation ("how much of this transaction is
    // covered"). A used amount always covers the transaction in the transaction's own direction, even when the linked
    // bank movement carries the opposite sign (e.g. an income receipt matched against an expense/collective transfer,
    // as with a Mollie payout that bundles income and fees). Signing by the movement's direction there would flip the
    // contribution and double the difference. Fall back to + so an unsaved 0-total still shows the allocation magnitude.
    const txSign = Math.sign(txTotal) || 1;
    // Count the portion actually used for this transaction (the allocation) — not the movements' full amounts — so a
    // partially used collective transfer reconciles correctly.
    const assignedSum = (linked ?? []).reduce((s, b) => {
        const amt = b.amount ?? 0;
        const alloc = b.allocatedAmount ?? Math.abs(amt);
        return s + txSign * alloc;
    }, 0);

    // Summary tile, in magnitudes so an expense and an income read the same. Without an amount yet (a draft whose amount
    // is still to be filled from a linked bank movement) nothing can be open or in surplus.
    const total = Math.abs(txTotal);
    const assigned = Math.abs(assignedSum);
    const rest = txTotal !== 0 ? Math.max(0, total - assigned) : 0;
    // Covered (or over-covered): nothing left to link, so the link button goes away.
    const covered = txTotal !== 0 && rest <= 0.005;
    // While a movement is selected in the picker the tile already shows what "Verknüpfen" would assign.
    const shown = assigned + preview;
    const shownRest = txTotal !== 0 ? Math.max(0, total - shown) : 0;
    const shownSurplus = txTotal !== 0 ? Math.max(0, shown - total) : 0;
    // Assigned reads green once it matches the amount exactly, gold while it is below and red above.
    const assignedColor =
        shown <= 0.005
            ? 'var(--ink-faint)'
            : txTotal === 0 || Math.abs(shown - total) <= 0.005
              ? 'var(--positive)'
              : shown < total
                ? 'var(--warning)'
                : 'var(--negative)';
    const summary: { key: string; label: string; value: number; color: string }[] = [
        { key: 'total', label: t('transactions.detail.reconcileTotal'), value: total, color: 'var(--foreground)' },
        { key: 'assigned', label: t('transactions.detail.reconcileAssigned'), value: shown, color: assignedColor },
        ...(shownRest > 0.005 && shown > 0 ? [{ key: 'open', label: t('transactions.detail.reconcileOpen'), value: shownRest, color: 'var(--warning)' }] : []),
        ...(shownSurplus > 0.005 ? [{ key: 'surplus', label: t('transactions.detail.reconcileSurplus'), value: shownSurplus, color: 'var(--negative)' }] : []),
    ];

    async function link(bankTxId: number, amount: number | undefined) {
        if (!tx.id) return;
        await addMatch.mutateAsync({ bankTxId, transactionId: tx.id, amount });
        closePicker();
    }

    function closePicker() {
        setPickerOpen(false);
        setPreview(0);
    }

    async function updateAmount(bankTxId: number, amount: number) {
        if (!tx.id) return;
        await updateMatchAmount.mutateAsync({ bankTxId, transactionId: tx.id, amount });
    }

    async function unlink(bankTxId: number) {
        if (!tx.id) return;
        await removeMatch.mutateAsync({ bankTxId, transactionId: tx.id });
    }

    // The signed portion of the transaction total that this bank movement currently covers. Signed to the transaction's
    // direction (txSign), matching assignedSum above, so removing it subtracts exactly its contribution.
    const contributionOf = (b: BankTransactionResponse) => txSign * (b.allocatedAmount ?? Math.abs(b.amount ?? 0));
    // Whether removing this bank movement would leave the transaction no longer fully covered.
    const wouldUncover = (b: BankTransactionResponse) => Math.abs(txTotal - (assignedSum - contributionOf(b))) > 0.005;

    // Entry point for the unlink button: only a *confirmed* transaction that would lose its full coverage needs the
    // confirmation-and-reopen flow; anything else (drafts, or removals that keep it covered) unlinks straight away.
    function requestUnlink(b: BankTransactionResponse) {
        if (tx.status === 'CONFIRMED' && wouldUncover(b)) {
            setUnlinkPending(b);
        } else if (b.id != null) {
            unlink(b.id);
        }
    }

    async function confirmUnlinkAndReopen() {
        const b = unlinkPending;
        if (!b || b.id == null || !tx.id) return;
        await removeMatch.mutateAsync({ bankTxId: b.id, transactionId: tx.id });
        // No longer fully covered, so move the confirmed transaction back to draft.
        await reopenMutation.mutateAsync(tx.id);
        setUnlinkPending(null);
    }

    return (
        <div className={className}>
            <Eyebrow icon={<Link2 size={14} />} className="mb-[11px]">
                {t('transactions.detail.payment')}
            </Eyebrow>

            <div className="flex flex-col gap-[11px]">
                {/* Sums: amount, what the linked movements cover, and what is still open or left over. There is no
                    separate coverage badge — the status badge already says whether the transaction is covered. */}
                <div
                    className="grid gap-3 rounded-[var(--r-card)] px-4 py-[13px]"
                    style={{ gridTemplateColumns: `repeat(${summary.length}, minmax(0, 1fr))`, background: 'var(--surface-track)' }}
                >
                    {summary.map((col) => (
                        <div key={col.key} className="min-w-0">
                            <div className="truncate text-[12.5px] font-semibold text-muted-foreground">{col.label}</div>
                            <div className="mt-[3px] text-[16px] font-extrabold tabular-nums" style={{ color: col.color }}>
                                {fmtCurrency(col.value)}
                            </div>
                        </div>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex items-center gap-2 p-3 text-[13px] text-muted-foreground">
                        <Loader2 size={14} className="animate-spin" />
                        {t('transactions.detail.bankLoading')}
                    </div>
                ) : (
                    (linked ?? []).map((b) => {
                        const amount = b.amount ?? 0;
                        return (
                            <div
                                key={b.id}
                                className="rounded-[var(--r-card)] border border-border-soft px-[15px] py-[13px]"
                                style={{ background: 'var(--background-secondary)' }}
                            >
                                <div className="flex items-start gap-3">
                                    <span
                                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--r-sm)]"
                                        style={{ background: 'var(--positive-surface)', color: 'var(--positive)' }}
                                    >
                                        <Landmark size={17} />
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate text-[14px] font-bold text-foreground">{b.counterpartyName || b.purpose || '—'}</span>
                                        <span className="mt-px text-[12.5px] text-muted-foreground">
                                            {fmtDate(b.bookingDate)} · {b.bankAccountName ?? '—'}
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => window.open(`/bank-accounts?bankTx=${b.id}`, '_blank', 'noopener,noreferrer')}
                                        title={t('transactions.detail.openBankTransaction')}
                                        className={ICON_BTN}
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                                <div className="mt-2.5 flex flex-wrap items-center gap-[9px]">
                                    <span
                                        className="text-[15px] font-extrabold tabular-nums"
                                        style={{ color: amount >= 0 ? 'var(--positive)' : 'var(--negative)' }}
                                    >
                                        {amount >= 0 ? '+ ' : '– '}
                                        {fmtCurrency(Math.abs(amount))}
                                    </span>
                                    <div className="flex-1" />
                                    <MatchAllocationControl
                                        variant="card"
                                        amount={b.allocatedAmount ?? Math.abs(amount)}
                                        max={Math.abs(amount)}
                                        pending={updateMatchAmount.isPending}
                                        onSave={(v) => updateAmount(b.id!, v)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => requestUnlink(b)}
                                        disabled={removeMatch.isPending}
                                        title={t('transactions.detail.unlink')}
                                        className={cn(ICON_BTN, 'hover:border-[var(--negative-border)] hover:text-[var(--negative)] disabled:opacity-50')}
                                    >
                                        <Unlink size={15} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Link picker */}
                {pickerOpen ? (
                    <BankTransactionPicker
                        txTotal={txTotal}
                        txDate={tx.transactionTime}
                        open={rest}
                        linkedIds={linkedIds}
                        pending={addMatch.isPending}
                        onLink={link}
                        onPreview={setPreview}
                        onClose={closePicker}
                    />
                ) : (
                    !covered && (
                        <button
                            type="button"
                            onClick={() => setPickerOpen(true)}
                            className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[var(--btn-radius)] border border-border-soft bg-[var(--background-secondary)] text-[14.5px] font-bold text-foreground transition-colors hover:bg-[var(--surface-sunken)]"
                        >
                            <Link2 size={16} />
                            {t('transactions.detail.linkBankTransaction')}
                        </button>
                    )
                )}
            </div>

            {/* Unlinking a bank match from a confirmed transaction that this would leave uncovered: confirm, then reopen. */}
            <ConfirmDialog
                open={unlinkPending != null}
                onOpenChange={(o) => !o && setUnlinkPending(null)}
                title={t('transactions.detail.unlinkReopen.title')}
                description={t('transactions.detail.unlinkReopen.description')}
                confirmLabel={t('transactions.detail.unlinkReopen.confirm')}
                onConfirm={confirmUnlinkAndReopen}
                destructive
                loading={removeMatch.isPending || reopenMutation.isPending}
            />
        </div>
    );
}
