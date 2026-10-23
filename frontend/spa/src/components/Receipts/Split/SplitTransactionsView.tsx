import type { TransactionResponse } from '@hopps/api-client';
import { Check, ExternalLink } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { categoryValuesOf, coveredOf, EPSILON, toIsoDate } from './splitHelpers';
import { PartBadge } from './SplitPartRow';
import { SumBar } from './SumBar';
import { useSplitLookups } from './useSplitEditor';

import { BankMatchSection } from '@/components/Transactions/BankMatchSection';
import { footerBtn } from '@/components/Transactions/drawerParts';
import { Eyebrow } from '@/components/Transactions/Eyebrow';
import { StatusBadge as TxStatusBadge } from '@/components/Transactions/StatusBadge';
import { HintTooltip } from '@/components/ui/HintTooltip';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { useBankTransactionsForTransaction } from '@/hooks/queries/useBankAccounts';
import { useConfirmTransaction } from '@/hooks/queries/useTransactions';
import { useCurrency } from '@/hooks/use-currency';
import { useToast } from '@/hooks/use-toast';
import { segmentColor, type SplitGroup } from '@/lib/splitParts';
import { getTransactionConfirmState } from '@/lib/transactionConfirm';

function InfoRows({ rows }: { rows: [string, ReactNode][] }) {
    return (
        <div className="rounded-[var(--r-card)] px-[18px] py-1.5" style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}>
            {rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-border-soft py-[13px] last:border-b-0">
                    <span className="text-[13.5px] font-semibold text-muted-foreground">{label}</span>
                    <span className="min-w-0 break-words text-right text-[14px] font-bold text-foreground">{value}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * Read view of one part: its values, the bank reconciliation of that transaction and, while it is a draft, the
 * confirm action under the same rules as the transaction drawer.
 */
function ReadPart({ tx, index, groups, bommelName }: { tx: TransactionResponse; index: number; groups: SplitGroup[]; bommelName: string | null }) {
    const { t } = useTranslation();
    const { format } = useCurrency();
    const navigate = useNavigate();
    const { showSuccess } = useToast();
    const confirmMutation = useConfirmTransaction();
    const { data: linkedBankTxns = [] } = useBankTransactionsForTransaction(tx.id);
    const values = categoryValuesOf(tx);
    const total = Number(tx.total ?? 0);
    const income = total >= 0;

    const confirmState = getTransactionConfirmState(
        {
            amount: tx.total != null ? total : null,
            date: toIsoDate(tx.transactionTime) || null,
            counterparty: tx.senderName || null,
            name: tx.name || null,
            bommelId: tx.bommelId ?? null,
        },
        linkedBankTxns
    );
    const missingGroups = groups.filter((g) => g.required && !values[g.id]);
    const canConfirm = confirmState.canConfirm && missingGroups.length === 0;
    const blockers = canConfirm ? null : (
        <>
            <span className="font-bold">{t('transactions.confirmBlockers.title')}</span>
            <span className="mt-0.5 block">
                {[...confirmState.missing.map((m) => t(`transactions.confirmBlockers.${m}`)), ...missingGroups.map((g) => g.name)].join(', ')}
            </span>
        </>
    );

    async function confirm() {
        if (tx.id == null) return;
        try {
            await confirmMutation.mutateAsync(tx.id);
            showSuccess(t('transactions.toast.confirmed'));
        } catch {
            // Shown by the global mutation error handler.
        }
    }

    const rows: [string, ReactNode][] = [
        [
            t('receipts.split.amount'),
            <span key="amount" className="tabular-nums" style={{ color: income ? 'var(--positive)' : 'var(--negative)' }}>
                {income ? '+ ' : '– '}
                {format(Math.abs(total))}
            </span>,
        ],
        [t('receipts.split.bommel'), bommelName ?? <span className="text-[var(--ink-faint)]">—</span>],
        ...groups.map((g): [string, ReactNode] => [g.name, values[g.id] ?? <span className="text-[var(--ink-faint)]">—</span>]),
    ];

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-extrabold text-foreground">
                    {tx.name || t('receipts.split.part', { n: index + 1 })}
                </span>
                <TxStatusBadge tx={tx} />
                <button
                    type="button"
                    onClick={() => navigate(`/transactions?id=${tx.id}`)}
                    title={t('receipts.split.openTransaction')}
                    aria-label={t('receipts.split.openTransaction')}
                    className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[11px] border border-border-soft text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground"
                    style={{ background: 'var(--background-secondary)' }}
                >
                    <ExternalLink size={16} />
                </button>
            </div>
            <InfoRows rows={rows} />
            {!tx.privatelyPaid && <BankMatchSection tx={tx} className="mt-1 border-t border-border-soft pt-4" />}
            {tx.status === 'DRAFT' && (
                <div className="flex justify-end">
                    <HintTooltip content={blockers}>
                        <BaseButton variant="default" onClick={confirm} disabled={confirmMutation.isPending || !canConfirm} className={footerBtn}>
                            <Check size={16} strokeWidth={2.5} />
                            {confirmMutation.isPending ? '…' : t('receipts.split.confirmPart')}
                        </BaseButton>
                    </HintTooltip>
                </div>
            )}
        </div>
    );
}

/**
 * The transactions booked from a split receipt: how much of them the bank movements cover, one tab per part and the
 * selected part with its values, bank reconciliation and confirm action. `receiptTotal` is the receipt amount, to
 * show a private share that was not booked.
 */
export function SplitTransactionsView({ parts, receiptTotal }: { parts: TransactionResponse[]; receiptTotal: number }) {
    const { t } = useTranslation();
    const { format } = useCurrency();
    const { groupsFor, bommelNameOf } = useSplitLookups();
    const [activeId, setActiveId] = useState<number | null>(null);

    const partsTotal = parts.reduce((s, p) => s + Math.abs(Number(p.total ?? 0)), 0);
    const coveredTotal = parts.reduce((s, p) => s + coveredOf(p), 0);
    const coverageOk = partsTotal > 0 && Math.abs(partsTotal - coveredTotal) < EPSILON;
    const notBooked = Math.max(0, receiptTotal - partsTotal);
    const activePart = parts.find((p) => p.id === activeId) ?? parts[0];
    const activeIndex = activePart ? parts.indexOf(activePart) : 0;

    return (
        <div className="flex flex-col" data-testid="split-transactions">
            <Eyebrow className="mb-2">{t('receipts.split.fromReceipt')}</Eyebrow>
            <div className="mb-3">
                <SumBar
                    value={format(coveredTotal)}
                    total={t('receipts.split.of', { total: format(partsTotal) })}
                    ok={coverageOk}
                    message={coverageOk ? t('receipts.split.covered') : t('receipts.split.uncovered', { amount: format(partsTotal - coveredTotal) })}
                    segments={parts.map((p, i) => ({
                        key: String(p.id),
                        value: coveredOf(p),
                        color: segmentColor(i),
                        title: `${p.name ?? ''}: ${format(coveredOf(p))}`,
                    }))}
                    activeKey={activePart ? String(activePart.id) : null}
                    onSelect={(key) => setActiveId(Number(key))}
                    footer={
                        notBooked > EPSILON ? (
                            <span className="text-[12px] font-semibold text-muted-foreground tabular-nums">
                                {t('receipts.split.notBooked', { amount: format(notBooked) })}
                            </span>
                        ) : undefined
                    }
                />
            </div>
            <div className="relative z-[1] -mb-px flex items-end gap-0.5 overflow-x-auto pt-1" style={{ scrollbarWidth: 'thin' }}>
                {parts.map((p, i) => {
                    const on = p.id === activePart?.id;
                    return (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setActiveId(p.id ?? null)}
                            title={p.name ?? undefined}
                            className="flex min-w-[130px] flex-1 items-center gap-2 px-3 py-2.5 text-left"
                            style={{
                                borderRadius: '11px 11px 0 0',
                                border: `1px solid ${on ? 'var(--border-soft)' : 'transparent'}`,
                                borderBottom: `1px solid ${on ? 'var(--background-secondary)' : 'transparent'}`,
                                background: on ? 'var(--background-secondary)' : 'transparent',
                                color: on ? 'var(--foreground)' : 'var(--muted-foreground)',
                            }}
                        >
                            <PartBadge index={i} />
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-[13px] font-extrabold">{p.name || t('receipts.split.part', { n: i + 1 })}</span>
                                <span className="text-[11.5px] font-semibold text-muted-foreground tabular-nums">{format(Math.abs(Number(p.total ?? 0)))}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
            {activePart && (
                <div
                    className="border border-border-soft px-4 pb-[18px] pt-4"
                    style={{
                        background: 'var(--background-secondary)',
                        borderRadius: activeIndex === 0 ? '0 var(--r-card) var(--r-card) var(--r-card)' : 'var(--r-card)',
                    }}
                >
                    <ReadPart
                        key={activePart.id}
                        tx={activePart}
                        index={activeIndex}
                        groups={groupsFor(activePart.bommelId ?? null)}
                        bommelName={bommelNameOf(activePart.bommelId)}
                    />
                </div>
            )}
        </div>
    );
}
