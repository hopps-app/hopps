import { useTranslation } from 'react-i18next';

import { BommelCardStatsProps } from '../types';

export function BommelCardStats({ total, income, expenses, isRoot }: BommelCardStatsProps) {
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-1">
            <div className="flex-1 text-center">
                <div className={`text-[7px] leading-tight ${isRoot ? 'text-white/60' : 'text-gray-400'}`}>{t('organization.structure.details.income')}</div>
                <div className={`text-[9px] font-medium leading-tight ${isRoot ? 'text-green-300' : 'text-green-600'}`}>+{(income / 1000).toFixed(1)}k€</div>
            </div>
            <div className="flex-1 text-center">
                <div className={`text-[7px] leading-tight ${isRoot ? 'text-white/60' : 'text-gray-400'}`}>{t('organization.structure.details.expenses')}</div>
                <div className={`text-[9px] font-medium leading-tight ${isRoot ? 'text-red-300' : 'text-red-500'}`}>-{(Math.abs(expenses) / 1000).toFixed(1)}k€</div>
            </div>
            <div className={`flex-1 text-center rounded px-1 py-0.5 ${isRoot ? 'bg-white/10' : 'bg-purple-50'}`}>
                <div className={`text-[7px] leading-tight ${isRoot ? 'text-white/70' : 'text-gray-500'}`}>{t('organization.structure.details.total')}</div>
                <div className={`text-[10px] font-bold leading-tight ${total >= 0 ? (isRoot ? 'text-green-300' : 'text-green-600') : (isRoot ? 'text-red-300' : 'text-red-500')}`}>
                    {total >= 0 ? '+' : ''}
                    {(total / 1000).toFixed(1)}k€
                </div>
            </div>
        </div>
    );
}

export default BommelCardStats;
