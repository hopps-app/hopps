import { useTranslation } from 'react-i18next';

import { BommelCardStatsProps } from '../types';

function formatCompact(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M€`;
    }
    if (abs >= 10_000) {
        return `${(value / 1000).toFixed(1)}k€`;
    }
    if (abs >= 1_000) {
        return `${(value / 1000).toFixed(2)}k€`;
    }
    return `${value.toLocaleString('de-DE', { maximumFractionDigits: 0 })}€`;
}

export function BommelCardStats({ total, income, expenses, isRoot }: BommelCardStatsProps) {
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-1">
            <div className="flex-1 text-center">
                <div className={`text-[7px] leading-tight ${isRoot ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
                    {t('organization.structure.details.income')}
                </div>
                <div className={`text-[9px] font-medium leading-tight ${isRoot ? 'text-green-300' : 'text-green-600 dark:text-green-400'}`}>
                    +{formatCompact(income)}
                </div>
            </div>
            <div className="flex-1 text-center">
                <div className={`text-[7px] leading-tight ${isRoot ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
                    {t('organization.structure.details.expenses')}
                </div>
                <div className={`text-[9px] font-medium leading-tight ${isRoot ? 'text-red-300' : 'text-red-500 dark:text-red-400'}`}>
                    -{formatCompact(Math.abs(expenses))}
                </div>
            </div>
            <div className={`flex-1 text-center rounded px-1 py-0.5 ${isRoot ? 'bg-white/10' : 'bg-purple-50 dark:bg-[var(--purple-50)]'}`}>
                <div className={`text-[7px] leading-tight ${isRoot ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                    {t('organization.structure.details.total')}
                </div>
                <div
                    className={`text-[10px] font-bold leading-tight ${total >= 0 ? (isRoot ? 'text-green-300' : 'text-green-600 dark:text-green-400') : isRoot ? 'text-red-300' : 'text-red-500 dark:text-red-400'}`}
                >
                    {total >= 0 ? '+' : ''}
                    {formatCompact(total)}
                </div>
            </div>
        </div>
    );
}

export default BommelCardStats;
