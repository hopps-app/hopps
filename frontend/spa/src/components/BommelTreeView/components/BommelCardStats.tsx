import { useTranslation } from 'react-i18next';

import { BommelCardStatsProps } from '../types';

import { cn } from '@/lib/utils';

/** Compact amount for the tree cards, e.g. "56,6k €" or "800 €". Cents would not fit the narrow cards. */
function formatCompact(language: string, value: number): string {
    if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toLocaleString(language, { maximumFractionDigits: 1 })}k €`;
    }
    return `${value.toLocaleString(language, { maximumFractionDigits: 0 })} €`;
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

export function BommelCardStats({ total, income, expenses, isRoot }: BommelCardStatsProps) {
    const { t, i18n } = useTranslation();
    const compact = (value: number) => formatCompact(i18n.language, value);
    const totalTone = total >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';

    return (
        <div
            className={cn(
                'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,auto)] items-end gap-2 mt-[11px] pt-2.5 border-t',
                isRoot ? 'border-white/20' : 'border-border-soft'
            )}
        >
            <Figure label={t('bommel.details.income')} value={`+${compact(Math.abs(income))}`} className={isRoot ? 'text-white' : 'text-[var(--positive)]'} />
            <Figure
                label={t('bommel.details.expenses')}
                value={`−${compact(Math.abs(expenses))}`}
                className={isRoot ? 'text-white' : 'text-[var(--negative)]'}
            />
            <div className={cn('min-w-0 rounded-[10px] px-[9px] py-1 text-right', isRoot ? 'bg-white/20' : 'bg-[var(--surface-sunken)]')}>
                <Figure
                    label={t('bommel.details.total')}
                    value={`${total >= 0 ? '+' : '−'}${compact(Math.abs(total))}`}
                    className={isRoot ? 'text-white' : totalTone}
                    strong
                />
            </div>
        </div>
    );
}

export default BommelCardStats;
