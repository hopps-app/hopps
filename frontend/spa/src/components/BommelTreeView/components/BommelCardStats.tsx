import { useTranslation } from 'react-i18next';

import { BommelCardStatsProps } from '../types';

export function BommelCardStats({ income, expenses, revenue, receiptsCount, receiptsOpen }: BommelCardStatsProps) {
    const { t } = useTranslation();

    return (
        <>
            <div className="flex justify-between items-center gap-2">
                <div className="flex-1 text-center">
                    <div className="text-[9px] text-white/70 mb-0.5">{t('organization.structure.details.income')}</div>
                    <div className="text-[11px] text-green-300 font-semibold">+{(income / 1000).toFixed(1)}k€</div>
                </div>

                <div className="flex-1 text-center">
                    <div className="text-[9px] text-white/70 mb-0.5">{t('organization.structure.details.expenses')}</div>
                    <div className="text-[11px] text-red-300 font-semibold">{(expenses / 1000).toFixed(1)}k€</div>
                </div>

                <div className="flex-1 text-center bg-white/15 rounded-md p-1">
                    <div className="text-[9px] text-white/70 mb-0.5">{t('organization.structure.details.revenue')}</div>
                    <div className={`text-xs font-bold ${revenue >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {revenue >= 0 ? '+' : ''}
                        {(revenue / 1000).toFixed(1)}k€
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-3 text-[10px] text-white/80">
                <span>
                    {receiptsCount} {t('organization.structure.receiptsLabel')}
                </span>
                {receiptsOpen > 0 && (
                    <span className="bg-orange-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">
                        {receiptsOpen} {t('organization.structure.openLabel')}
                    </span>
                )}
            </div>
        </>
    );
}

export default BommelCardStats;
