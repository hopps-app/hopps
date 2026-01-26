import { useTranslation } from 'react-i18next';

import { BommelCardStatsProps } from '../types';

export function BommelCardStats({ total, income, expenses, transactionsCount }: BommelCardStatsProps) {
    const { t } = useTranslation();

    return (
        <>
            {/* Income and Expenses - smaller, side by side */}
            <div className="flex justify-center items-center gap-1">
                <div className="flex-1 text-center">
                    <div className="text-[8px] text-white/60">{t('organization.structure.details.income')}</div>
                    <div className="text-[9px] font-medium text-green-300">+{(income / 1000).toFixed(1)}k€</div>
                </div>
                <div className="flex-1 text-center">
                    <div className="text-[8px] text-white/60">{t('organization.structure.details.expenses')}</div>
                    <div className="text-[9px] font-medium text-red-300">-{(Math.abs(expenses) / 1000).toFixed(1)}k€</div>
                </div>
            </div>

            {/* Total - emphasized with border */}
            <div className="text-center border border-white/30 rounded-md px-2 py-1">
                <div className="text-[8px] text-white/70">{t('organization.structure.details.total')}</div>
                <div className={`text-[11px] font-bold ${total >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {total >= 0 ? '+' : ''}
                    {(total / 1000).toFixed(1)}k€
                </div>
            </div>

            <div className="flex justify-center gap-3 text-[9px] text-white/70">
                <span>
                    {transactionsCount} {t('organization.structure.transactionsLabel')}
                </span>
            </div>
        </>
    );
}

export default BommelCardStats;
