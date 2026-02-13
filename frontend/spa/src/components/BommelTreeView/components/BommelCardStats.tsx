import { useTranslation } from 'react-i18next';

import { BommelCardStatsProps } from '../types';

export function BommelCardStats({ total, income, expenses }: BommelCardStatsProps) {
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-1">
            <div className="flex-1 text-center">
                <div className="text-[7px] text-white/60 leading-tight">{t('organization.structure.details.income')}</div>
                <div className="text-[9px] font-medium text-green-300 leading-tight">+{(income / 1000).toFixed(1)}k€</div>
            </div>
            <div className="flex-1 text-center">
                <div className="text-[7px] text-white/60 leading-tight">{t('organization.structure.details.expenses')}</div>
                <div className="text-[9px] font-medium text-red-300 leading-tight">-{(Math.abs(expenses) / 1000).toFixed(1)}k€</div>
            </div>
            <div className="flex-1 text-center bg-white/10 rounded px-1 py-0.5">
                <div className="text-[7px] text-white/70 leading-tight">{t('organization.structure.details.total')}</div>
                <div className={`text-[10px] font-bold leading-tight ${total >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {total >= 0 ? '+' : ''}
                    {(total / 1000).toFixed(1)}k€
                </div>
            </div>
        </div>
    );
}

export default BommelCardStats;
