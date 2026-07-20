import { Check, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { parseAllocationAmount } from '@/utils/parseAmount';

function fmtCurrency(amount: number, currency = 'EUR'): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
}

interface Props {
    /** Current allocated (used) amount — a positive magnitude. */
    amount: number;
    /** Maximum allowed value: the bank movement's own amount — a match can never use more of a movement than it holds.
     *  Also styles full vs. partial. */
    max: number;
    currency?: string;
    pending?: boolean;
    onSave: (value: number) => void;
}

/**
 * Compact, inline-editable "amount used" control. Renders as a subtle chip showing how much of a bank movement is used
 * for a transaction; the full amount reads muted, a partial amount is highlighted. Clicking opens a tiny number input.
 * Shared by both link directions (transaction detail and the bank-transaction match drawer).
 */
export function MatchAllocationControl({ amount, max, currency = 'EUR', pending, onSave }: Props) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState('');
    const [error, setError] = useState(false);

    const isPartial = amount < max - 0.005;

    function start() {
        setText(amount.toFixed(2).replace('.', ','));
        setError(false);
        setEditing(true);
    }

    function cancel() {
        setEditing(false);
        setError(false);
    }

    function save() {
        const value = parseAllocationAmount(text);
        // Positive and at most the bank movement's own amount — a match can never use more of a movement than it holds.
        if (value == null || value <= 0 || value > max + 0.005) {
            setError(true);
            return;
        }
        onSave(value);
        setEditing(false);
    }

    if (editing) {
        return (
            <span className="inline-flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <input
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        setError(false);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') save();
                        if (e.key === 'Escape') cancel();
                    }}
                    aria-invalid={error}
                    className={cn(
                        'w-[4.5rem] px-1.5 py-0.5 text-[12px] text-right tabular-nums rounded-md border bg-transparent outline-none',
                        error ? 'border-red-400' : 'border-primary'
                    )}
                />
                <button
                    type="button"
                    onClick={save}
                    disabled={pending}
                    title={t('common.save')}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50"
                >
                    <Check size={13} />
                </button>
                <button
                    type="button"
                    onClick={cancel}
                    title={t('common.cancel')}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <X size={13} />
                </button>
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                start();
            }}
            title={t('transactions.detail.editUsedAmount')}
            className={cn(
                'inline-flex items-center gap-1 flex-shrink-0 text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md transition-colors',
                isPartial
                    ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                    : 'text-muted-foreground/60 hover:text-primary hover:bg-primary/5'
            )}
        >
            {/* Full amount: just a subtle pencil — the amount is already shown next to it. Partial: surface the used
                amount so the split is visible at a glance. */}
            {isPartial && <span>{t('transactions.detail.usedAmount', { amount: fmtCurrency(amount, currency) })}</span>}
            <Pencil size={11} />
        </button>
    );
}
