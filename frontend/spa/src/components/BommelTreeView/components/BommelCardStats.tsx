import { useTranslation } from 'react-i18next';

import { BommelCardStatsProps } from '../types';

import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';

/** Compact amount for the tree cards, e.g. "56,6k €" or "800 CHF". Cents would not fit the narrow cards. */
function formatCompact(language: string, symbol: string, value: number): string {
    if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toLocaleString(language, { maximumFractionDigits: 1 })}k ${symbol}`;
    }
    return `${value.toLocaleString(language, { maximumFractionDigits: 0 })} ${symbol}`;
}

interface FigureProps {
    label: string;
    value: string;
    className: string;
    strong?: boolean;
}

function Figure({ label, value, className, strong }: FigureProps) {
    return (
        <div className="min-w-0">
            <div className="text-[9.5px] font-extrabold tracking-[0.03em] uppercase opacity-[0.65] whitespace-nowrap overflow-hidden">{label}</div>
            <div className={cn('tabular-nums font-extrabold whitespace-nowrap', strong ? 'text-[13px]' : 'text-[12.5px]', className)}>{value}</div>
        </div>
    );
}

export function BommelCardStats({ total, income, expenses, isRoot, carryOver }: BommelCardStatsProps) {
    const { t, i18n } = useTranslation();
    const { symbol } = useCurrency();
    const compact = (value: number) => formatCompact(i18n.language, symbol, value);
    const signed = (value: number) => `${value >= 0 ? '+' : '−'}${compact(Math.abs(value))}`;
    // With the balance shown, the total is where the period ends: the carry-over plus what the period added
    const shownTotal = carryOver != null ? carryOver + total : total;
    const totalTone = shownTotal >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';

    return (
        <div data-guide="card-stats" className={cn('mt-[11px] pt-2.5 border-t', isRoot ? 'border-white/20' : 'border-border-soft')}>
            {/* The carry-over is neither income nor expense, so it is shown in the neutral text colour */}
            {carryOver != null && (
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-[9.5px] font-extrabold tracking-[0.03em] uppercase opacity-[0.65] whitespace-nowrap">
                        {t('bommel.details.carryOver')}
                    </span>
                    <span className={cn('tabular-nums font-extrabold whitespace-nowrap text-[12.5px]', isRoot ? 'text-white' : 'text-foreground')}>
                        {signed(carryOver)}
                    </span>
                </div>
            )}
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,auto)] items-end gap-2">
                <Figure
                    label={t('bommel.details.income')}
                    value={`+${compact(Math.abs(income))}`}
                    className={isRoot ? 'text-white' : 'text-[var(--positive)]'}
                />
                <Figure
                    label={t('bommel.details.expenses')}
                    value={`−${compact(Math.abs(expenses))}`}
                    className={isRoot ? 'text-white' : 'text-[var(--negative)]'}
                />
                <div className={cn('min-w-0 rounded-[10px] px-[9px] py-1 text-right', isRoot ? 'bg-white/20' : 'bg-[var(--surface-sunken)]')}>
                    <Figure label={t('bommel.details.total')} value={signed(shownTotal)} className={isRoot ? 'text-white' : totalTone} strong />
                </div>
            </div>
        </div>
    );
}

export default BommelCardStats;
