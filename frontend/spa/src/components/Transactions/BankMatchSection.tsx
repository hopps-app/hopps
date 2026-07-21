import { TransactionResponse } from '@hopps/api-client';
import { Link2, Unlink, ExternalLink, FileText, Landmark, Loader2, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { MatchAllocationControl } from '@/components/Transactions/MatchAllocationControl';
import {
    useBankTransactionsForTransaction,
    useBankTransactionSearch,
    useAddBankTransactionMatch,
    useRemoveBankTransactionMatch,
    useUpdateBankTransactionMatchAmount,
} from '@/hooks/queries/useBankAccounts';
import { cn } from '@/lib/utils';
import { parseAllocationAmount } from '@/utils/parseAmount';

function fmtCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

function fmtDate(date: Date | string | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Shows a bank transaction's amount. If it is already partially matched, the still-open (uncovered) amount
// is shown below the actual amount.
function BankTxAmount({ amount, matchedAmount }: { amount?: number; matchedAmount?: number }) {
    const { t } = useTranslation();
    const total = amount ?? 0;
    // matchedAmount is the SIGNED net coverage; the still-open amount is |total − matched|.
    const matched = matchedAmount ?? 0;
    const open = Math.abs(total - matched);
    const partiallyMatched = matched !== 0 && open > 0.005;

    return (
        <span className="flex flex-col items-end flex-shrink-0 leading-tight">
            <span className="text-[13px] font-bold tabular-nums" style={{ color: total >= 0 ? '#1F7A50' : '#B12C4C' }}>
                {fmtCurrency(total)}
            </span>
            {partiallyMatched && (
                <span className="text-[11px] font-semibold text-[#B47C18] tabular-nums">
                    {t('transactions.detail.openAmount', { amount: fmtCurrency(open) })}
                </span>
            )}
        </span>
    );
}

/**
 * Reconciliation section for linking bank transactions to a transaction record. Shared between the transaction
 * detail drawer and the receipt review drawer so bank transactions can be assigned in either place.
 */
export function BankMatchSection({ tx, currentTotal }: { tx: TransactionResponse; currentTotal?: number | null }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: linked, isLoading } = useBankTransactionsForTransaction(tx.id);
    const addMatch = useAddBankTransactionMatch();
    const removeMatch = useRemoveBankTransactionMatch();
    const updateMatchAmount = useUpdateBankTransactionMatchAmount();

    const [pickerOpen, setPickerOpen] = useState(false);
    const [search, setSearch] = useState('');
    // Optional partial "amount used" applied to the next linked bank transaction (rarely needed — splitting a
    // collective transfer). Empty means the full amount.
    const [linkAmount, setLinkAmount] = useState('');
    const { data: results, isFetching } = useBankTransactionSearch(search, pickerOpen);

    // The purpose ("Verwendungszweck") is often long, so it is hidden by default; the user can reveal it per candidate
    // to check the assignment (e.g. that the reference contains the invoice number). Tracks which rows are expanded.
    const [purposeShown, setPurposeShown] = useState<Set<number>>(new Set());
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

    const linkedIds = new Set((linked ?? []).map((b) => b.id));

    // Amount reconciliation from the transaction's side — the mirror of the bank-transaction drawer: how much of this
    // transaction's total is already covered by linked bank movements, and how much still needs to be assigned. Signed
    // like the bank side (expense negative on both sides), so remaining = transaction total − sum of linked amounts.
    // In the edit form the amount/direction can change before saving; currentTotal (when provided) feeds the live
    // signed value so the reconciliation flips immediately when income↔expense is toggled. Falls back to the saved total.
    const txTotal = currentTotal !== undefined ? (currentTotal ?? 0) : tx.total != null ? Number(tx.total) : 0;
    // Count the portion actually used for this transaction (the allocation), signed by the bank movement's direction —
    // not the movements' full amounts — so a partially used collective transfer reconciles correctly.
    const assignedSum = (linked ?? []).reduce((s, b) => {
        const amt = b.amount ?? 0;
        const alloc = b.allocatedAmount ?? Math.abs(amt);
        return s + Math.sign(amt) * alloc;
    }, 0);
    const remaining = txTotal - assignedSum;
    const isFullyAssigned = Math.abs(remaining) <= 0.005; // float tolerance

    // Pre-fill the search with the amount that is still open (not the full total), so the matching bank movements for
    // the remaining portion surface immediately. German decimal comma matches what the user sees; the backend also
    // accepts a dot. Empty once the transaction is fully covered.
    const openForSearch = Math.abs(remaining);
    const openAmountStr = openForSearch > 0.005 ? openForSearch.toFixed(2).replace('.', ',') : '';

    // Order the picker so the bank transaction whose booking date is the closest ON/AFTER the receipt (transaction)
    // date is at the top — that is the most likely match (the money usually leaves the account on or shortly after the
    // receipt date). Dates before the receipt date follow (nearest first); entries without a date go last.
    const refDate = tx.transactionTime ? new Date(tx.transactionTime).getTime() : null;
    const candidates = (results ?? [])
        .filter((b) => !linkedIds.has(b.id))
        .map((b) => {
            const d = b.bookingDate ? new Date(b.bookingDate).getTime() : null;
            const delta = d != null && refDate != null ? d - refDate : null;
            return { b, group: delta == null ? 2 : delta >= 0 ? 0 : 1, dist: delta == null ? 0 : Math.abs(delta) };
        })
        .sort((x, y) => x.group - y.group || x.dist - y.dist)
        .map((x) => x.b);

    function openPicker() {
        setSearch(openAmountStr);
        setPickerOpen(true);
    }

    async function link(bankTxId: number, bankAmount: number) {
        if (!tx.id) return;
        // Apply the optional amount only when it is positive and at most this movement's own amount (a match can't use
        // more of a movement than it holds); otherwise link the default amount.
        const parsed = parseAllocationAmount(linkAmount);
        const cap = Math.abs(bankAmount);
        const amount = parsed != null && parsed > 0 && parsed <= cap + 0.005 ? parsed : undefined;
        await addMatch.mutateAsync({ bankTxId, transactionId: tx.id, amount });
        setPickerOpen(false);
        setSearch('');
        setLinkAmount('');
    }

    async function updateAmount(bankTxId: number, amount: number) {
        if (!tx.id) return;
        await updateMatchAmount.mutateAsync({ bankTxId, transactionId: tx.id, amount });
    }

    async function unlink(bankTxId: number) {
        if (!tx.id) return;
        await removeMatch.mutateAsync({ bankTxId, transactionId: tx.id });
    }

    return (
        <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
                <Link2 size={15} className="text-[#7E3FB4]" />
                <span className="text-[14px] font-bold text-[#1B1B1F]">{t('transactions.detail.payment')}</span>
            </div>

            {/* Always-visible coverage indicator: how much of this transaction still needs to be covered by bank
                movements — shown even before anything is linked, so the open amount is never hidden (regardless of
                confirm status, mirroring the transactions table). */}
            {txTotal !== 0 &&
                (() => {
                    // Three states: fully covered (green), still open (amber), or over-covered when the linked
                    // movements exceed the transaction amount (red).
                    const overCovered = !isFullyAssigned && Math.abs(assignedSum) > Math.abs(txTotal);
                    const bg = isFullyAssigned ? '#E7F4EC' : overCovered ? '#FBEAEF' : '#FBF3E4';
                    const color = isFullyAssigned ? '#1F7A50' : overCovered ? '#B12C4C' : '#B47C18';
                    return (
                        <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2 rounded-[10px]" style={{ background: bg }}>
                            <span className="text-[12px] font-semibold" style={{ color }}>
                                {isFullyAssigned
                                    ? t('transactions.detail.fullyCovered')
                                    : overCovered
                                      ? t('transactions.detail.overCovered', { amount: fmtCurrency(Math.abs(remaining)) })
                                      : t('transactions.detail.stillToCover', { amount: fmtCurrency(Math.abs(remaining)) })}
                            </span>
                            {isFullyAssigned && <span className="text-[13px] font-bold text-[#1F7A50]">✓</span>}
                        </div>
                    );
                })()}

            {isLoading ? (
                <div className="flex items-center gap-2 p-3 text-[13px] text-[#6B6B76]">
                    <Loader2 size={14} className="animate-spin" />
                    {t('transactions.detail.bankLoading')}
                </div>
            ) : linked && linked.length > 0 ? (
                <>
                    <div className="space-y-2">
                        {linked.map((b) => (
                            <div key={b.id} className="flex items-center gap-3 p-3 rounded-[10px] border border-[#E9E9EE]" style={{ background: '#F8F8FA' }}>
                                <button
                                    type="button"
                                    onClick={() => window.open(`/bank-accounts?bankTx=${b.id}`, '_blank', 'noopener,noreferrer')}
                                    title={t('transactions.detail.openBankTransaction')}
                                    className="flex items-center gap-3 min-w-0 flex-1 text-left group"
                                >
                                    <span className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: '#E7F4EC' }}>
                                        <Landmark size={16} className="text-[#1F7A50]" />
                                    </span>
                                    <span className="flex flex-col min-w-0 flex-1">
                                        <span className="text-[13px] font-bold text-[#1B1B1F] truncate">{b.counterpartyName || b.purpose || '—'}</span>
                                        <span className="text-[12px] text-[#6B6B76]">
                                            {fmtDate(b.bookingDate)} · {b.bankAccountName ?? '—'}
                                        </span>
                                    </span>
                                    <span
                                        className="text-[13px] font-bold tabular-nums flex-shrink-0"
                                        style={{ color: (b.amount ?? 0) >= 0 ? '#1F7A50' : '#B12C4C' }}
                                    >
                                        {fmtCurrency(b.amount)}
                                    </span>
                                    <ExternalLink size={15} className="text-[#9A9AA3] group-hover:text-[#7E3FB4] transition-colors flex-shrink-0" />
                                </button>
                                <MatchAllocationControl
                                    amount={b.allocatedAmount ?? Math.abs(b.amount ?? 0)}
                                    max={Math.abs(b.amount ?? 0)}
                                    pending={updateMatchAmount.isPending}
                                    onSave={(v) => updateAmount(b.id!, v)}
                                />
                                <button
                                    onClick={() => unlink(b.id!)}
                                    disabled={removeMatch.isPending}
                                    title={t('transactions.detail.unlink')}
                                    className="w-8 h-8 flex items-center justify-center rounded-full border border-[#E9E9EE] text-[#6B6B76] hover:text-[#B12C4C] hover:border-[#E8A0B2] transition-colors flex-shrink-0 disabled:opacity-50"
                                >
                                    <Unlink size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Difference summary — mirrors the bank-transaction drawer so the user sees how much bank-movement
                        amount still needs to be assigned to reach this transaction's total. */}
                    <div
                        className="mt-3 rounded-[10px] px-4 py-3 flex items-center justify-between gap-3"
                        style={{ background: isFullyAssigned ? '#E7F4EC' : '#F8F8FA' }}
                    >
                        <span className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-semibold text-[#6B6B76]">{t('transactions.detail.reconcileTotal')}</span>
                            <span className="text-[13px] font-bold tabular-nums text-[#1B1B1F]">{fmtCurrency(Math.abs(txTotal))}</span>
                        </span>
                        <span className="flex flex-col gap-0.5 text-right">
                            <span className="text-[11px] font-semibold text-[#6B6B76]">{t('transactions.detail.reconcileAssigned')}</span>
                            <span className="text-[13px] font-bold tabular-nums" style={{ color: '#1F7A50' }}>
                                {fmtCurrency(Math.abs(assignedSum))}
                            </span>
                        </span>
                        <span className="flex flex-col gap-0.5 text-right">
                            <span className="text-[11px] font-semibold text-[#6B6B76]">
                                {isFullyAssigned ? t('transactions.detail.reconcileFull') : t('transactions.detail.reconcileRemaining')}
                            </span>
                            <span className="text-[13px] font-bold tabular-nums" style={{ color: isFullyAssigned ? '#1F7A50' : '#B47C18' }}>
                                {isFullyAssigned ? '✓' : fmtCurrency(Math.abs(remaining))}
                            </span>
                        </span>
                    </div>
                </>
            ) : (
                <div className="flex items-start gap-3 p-3 rounded-[10px] mb-2" style={{ background: '#F3EAFB' }}>
                    <Unlink size={15} className="text-[#7E3FB4] mt-0.5 flex-shrink-0" />
                    <p className="text-[13px] text-[#7E3FB4] font-medium">{t('transactions.detail.notLinked')}</p>
                </div>
            )}

            {/* Link picker */}
            {pickerOpen ? (
                <div className="mt-3 rounded-[12px] border border-[#E9E9EE] overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E9E9EE]" style={{ background: '#F8F8FA' }}>
                        <Search size={14} className="text-[#9A9AA3]" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('transactions.detail.bankSearchPlaceholder')}
                            className="flex-1 bg-transparent text-[13px] text-[#1B1B1F] placeholder-[#9A9AA3] outline-none"
                        />
                        <button onClick={() => setPickerOpen(false)} className="text-[#9A9AA3] hover:text-[#1B1B1F] transition-colors">
                            <X size={15} />
                        </button>
                    </div>
                    {/* Optional partial amount — rarely needed (splitting a collective transfer). Empty = full amount. */}
                    <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-[#F1F1F4]">
                        <span className="text-[11px] text-[#9A9AA3]">{t('transactions.detail.partialAmountLabel')}</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={linkAmount}
                            onChange={(e) => setLinkAmount(e.target.value)}
                            placeholder={t('transactions.detail.partialAmountPlaceholder')}
                            className="w-24 px-1.5 py-0.5 text-[12px] text-right tabular-nums rounded-md border border-[#E9E9EE] outline-none focus:border-[#C7A2E3]"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {isFetching ? (
                            <div className="flex items-center gap-2 px-3 py-4 text-[13px] text-[#6B6B76]">
                                <Loader2 size={14} className="animate-spin" />
                                {t('transactions.detail.bankLoading')}
                            </div>
                        ) : candidates.length === 0 ? (
                            <p className="px-3 py-4 text-[13px] text-[#9A9AA3] text-center">{t('transactions.detail.bankNoResults')}</p>
                        ) : (
                            candidates.map((b) => {
                                const showPurpose = b.id != null && purposeShown.has(b.id);
                                return (
                                    <div key={b.id} className="border-b border-[#F1F1F4] last:border-b-0">
                                        <div className="w-full flex items-center gap-2 pl-3 pr-2 hover:bg-[#F3EAFB] transition-colors">
                                            <button
                                                onClick={() => link(b.id!, b.amount ?? 0)}
                                                disabled={addMatch.isPending}
                                                className="flex items-center gap-3 min-w-0 flex-1 py-2.5 text-left disabled:opacity-50"
                                            >
                                                <span
                                                    className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                                                    style={{ background: '#F1F1F4' }}
                                                >
                                                    <Landmark size={15} className="text-[#6B6B76]" />
                                                </span>
                                                <span className="flex flex-col min-w-0 flex-1">
                                                    <span className="text-[13px] font-bold text-[#1B1B1F] truncate">
                                                        {b.counterpartyName || b.purpose || '—'}
                                                    </span>
                                                    <span className="text-[12px] text-[#6B6B76]">
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
                                                        'w-7 h-7 flex items-center justify-center rounded-full border transition-colors flex-shrink-0',
                                                        showPurpose
                                                            ? 'border-[#C7A2E3] text-[#7E3FB4] bg-[#F3EAFB]'
                                                            : 'border-[#E9E9EE] text-[#9A9AA3] hover:text-[#7E3FB4] hover:border-[#C7A2E3]'
                                                    )}
                                                >
                                                    <FileText size={13} />
                                                </button>
                                            )}
                                        </div>
                                        {showPurpose && b.purpose && (
                                            <div className="px-3 pb-2.5">
                                                <p
                                                    className="text-[12px] text-[#4B4B55] whitespace-pre-wrap break-words rounded-[8px] px-2.5 py-2"
                                                    style={{ background: '#F8F8FA' }}
                                                >
                                                    <span className="font-semibold text-[#6B6B76]">{t('transactions.detail.purpose')}: </span>
                                                    {b.purpose}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            ) : (
                <button
                    onClick={openPicker}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[13.5px] font-bold border border-[#E0E0E6] text-[#7E3FB4] hover:bg-[#F3EAFB] hover:border-[#C7A2E3] transition-colors"
                >
                    <Link2 size={14} />
                    {t('transactions.detail.linkBankTransaction')}
                </button>
            )}

            {/* Hint to manage matches from the bank side */}
            {tx.id && (
                <button
                    onClick={() => navigate('/bank-accounts')}
                    className="mt-2 w-full text-[12px] text-[#9A9AA3] hover:text-[#7E3FB4] transition-colors text-center"
                >
                    {t('transactions.detail.openBankAccounts')}
                </button>
            )}
        </div>
    );
}
