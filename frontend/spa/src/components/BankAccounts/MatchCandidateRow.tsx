import { TransactionResponse } from '@hopps/api-client';
import { Check, ExternalLink, FileText, Receipt, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { fmtDate } from '@/components/BankAccounts/format';
import { confidenceTone, STRONG_MATCH } from '@/components/BankAccounts/useMatchCandidates';
import { Badge } from '@/components/Transactions/StatusBadge';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';

const SMALL_BTN =
    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[var(--btn-radius)] border transition-colors hover:border-purple-300 hover:text-purple-700';

function Confidence({ value }: { value: number }) {
    const { t } = useTranslation();
    return (
        <Badge tone={confidenceTone(value)}>
            <Sparkles size={12} />
            {t('konten.drawer.confidence', { pct: Math.round(value * 100) })}
        </Badge>
    );
}

/**
 * The head of a candidate, the same in the picker and on the drawer's suggestions: icon tile (a check while `selected`),
 * name, date and counterparty, the confidence pill when a strong `score` is passed, and the amount.
 */
export function CandidateInfo({ tx, score, selected = false }: { tx: TransactionResponse; score?: number; selected?: boolean }) {
    const { format } = useCurrency();
    return (
        <>
            <span
                className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[var(--r-sm)]"
                style={{
                    background: selected ? 'var(--primary)' : 'var(--surface-track)',
                    color: selected ? '#fff' : 'var(--muted-foreground)',
                }}
            >
                {selected ? <Check size={18} strokeWidth={3} /> : <Receipt size={17} />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14.5px] font-bold text-foreground">{tx.name || '—'}</span>
                <span className="truncate text-[12.5px] text-muted-foreground">
                    {fmtDate(tx.transactionTime)} · {tx.senderName || '—'}
                </span>
            </span>
            {score != null && score >= STRONG_MATCH && <Confidence value={score} />}
            <span className="flex-shrink-0 whitespace-nowrap text-[14.5px] font-extrabold tabular-nums">{format(Math.abs(tx.total ?? 0))}</span>
        </>
    );
}

/** Small buttons of a picker row: show its receipt next to the drawer (if it has one), and open it in a new tab. */
export function CandidateActions({
    tx,
    previewDocId,
    onTogglePreview,
}: {
    tx: TransactionResponse;
    previewDocId: number | null;
    onTogglePreview: (documentId: number) => void;
}) {
    const { t } = useTranslation();
    const shown = tx.documentId != null && previewDocId === tx.documentId;
    return (
        <>
            {tx.documentId != null && (
                <button
                    type="button"
                    onClick={() => onTogglePreview(tx.documentId!)}
                    aria-pressed={shown}
                    title={shown ? t('konten.drawer.hideReceipt') : t('konten.drawer.showReceipt')}
                    className={cn(
                        SMALL_BTN,
                        shown ? 'border-purple-300 bg-[var(--accent-surface)] text-purple-700' : 'border-border-soft text-[var(--ink-faint)]'
                    )}
                >
                    <FileText size={13} />
                </button>
            )}
            {/* Open the transaction in a new tab, so this assignment stays open. */}
            <button
                type="button"
                onClick={() => window.open(`/transactions?id=${tx.id}`, '_blank', 'noopener,noreferrer')}
                title={t('konten.drawer.openTransactionNewTab')}
                className={cn(SMALL_BTN, 'border-border-soft text-[var(--ink-faint)]')}
            >
                <ExternalLink size={13} />
            </button>
        </>
    );
}
