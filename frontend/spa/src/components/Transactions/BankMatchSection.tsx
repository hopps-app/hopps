import { TransactionResponse } from '@hopps/api-client';
import { Link2, Unlink, ExternalLink, Landmark, Loader2, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
    useBankTransactionsForTransaction,
    useBankTransactionSearch,
    useAddBankTransactionMatch,
    useRemoveBankTransactionMatch,
} from '@/hooks/queries/useBankAccounts';

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
    const matched = matchedAmount ?? 0;
    const partiallyMatched = matched > 0 && matched < Math.abs(total);
    const open = Math.abs(total) - matched;

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
export function BankMatchSection({ tx }: { tx: TransactionResponse }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: linked, isLoading } = useBankTransactionsForTransaction(tx.id);
    const addMatch = useAddBankTransactionMatch();
    const removeMatch = useRemoveBankTransactionMatch();

    const [pickerOpen, setPickerOpen] = useState(false);
    const [search, setSearch] = useState('');
    const { data: results, isFetching } = useBankTransactionSearch(search, pickerOpen);

    const linkedIds = new Set((linked ?? []).map((b) => b.id));

    // The transaction total is the amount still to be reconciled — pre-fill it as the search term so the matching
    // bank transactions surface immediately. German decimal comma matches what the user sees; the backend also
    // accepts a dot. Bank transactions are found by their full or still-open amount.
    const openAmount = tx.total != null ? Math.abs(Number(tx.total)) : 0;
    const openAmountStr = openAmount ? openAmount.toFixed(2).replace('.', ',') : '';

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

    async function link(bankTxId: number) {
        if (!tx.id) return;
        await addMatch.mutateAsync({ bankTxId, transactionId: tx.id });
        setPickerOpen(false);
        setSearch('');
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

            {isLoading ? (
                <div className="flex items-center gap-2 p-3 text-[13px] text-[#6B6B76]">
                    <Loader2 size={14} className="animate-spin" />
                    {t('transactions.detail.bankLoading')}
                </div>
            ) : linked && linked.length > 0 ? (
                <div className="space-y-2">
                    {linked.map((b) => (
                        <div key={b.id} className="flex items-center gap-3 p-3 rounded-[10px] border border-[#E9E9EE]" style={{ background: '#F8F8FA' }}>
                            <button
                                type="button"
                                onClick={() => navigate(`/bank-accounts?bankTx=${b.id}`)}
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
                    <div className="max-h-64 overflow-y-auto">
                        {isFetching ? (
                            <div className="flex items-center gap-2 px-3 py-4 text-[13px] text-[#6B6B76]">
                                <Loader2 size={14} className="animate-spin" />
                                {t('transactions.detail.bankLoading')}
                            </div>
                        ) : candidates.length === 0 ? (
                            <p className="px-3 py-4 text-[13px] text-[#9A9AA3] text-center">{t('transactions.detail.bankNoResults')}</p>
                        ) : (
                            candidates.map((b) => (
                                <button
                                    key={b.id}
                                    onClick={() => link(b.id!)}
                                    disabled={addMatch.isPending}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-[#F1F1F4] last:border-b-0 hover:bg-[#F3EAFB] transition-colors disabled:opacity-50"
                                >
                                    <span className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: '#F1F1F4' }}>
                                        <Landmark size={15} className="text-[#6B6B76]" />
                                    </span>
                                    <span className="flex flex-col min-w-0 flex-1">
                                        <span className="text-[13px] font-bold text-[#1B1B1F] truncate">{b.counterpartyName || b.purpose || '—'}</span>
                                        <span className="text-[12px] text-[#6B6B76]">
                                            {fmtDate(b.bookingDate)} · {b.bankAccountName ?? '—'}
                                        </span>
                                    </span>
                                    <BankTxAmount amount={b.amount} matchedAmount={b.matchedAmount} />
                                </button>
                            ))
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
