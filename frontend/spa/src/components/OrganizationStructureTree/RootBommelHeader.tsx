import { useTranslation } from 'react-i18next';

import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import Emoji from '@/components/ui/Emoji.tsx';
import { cn } from '@/lib/utils.ts';

type Props = {
    node: OrganizationTreeNodeModel;
    isSelected: boolean;
    isEditable: boolean;
    onClick: () => void;
};

const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toLocaleString('de-DE')}€`;
};

function RootBommelHeader({ node, isSelected, isEditable, onClick }: Props) {
    const { t } = useTranslation();
    const { data } = node;

    return (
        <div
            onClick={onClick}
            className={cn('p-4 cursor-pointer transition-all border-b border-white/20', {
                'ring-2 ring-inset ring-white/50': isSelected,
            })}
            style={{ background: 'linear-gradient(to right, var(--purple-500), var(--purple-600))' }}
        >
            <div className="flex items-center justify-between gap-4">
                {/* Left: Name and info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {data?.emoji && (
                            <span className="flex-shrink-0">
                                <Emoji emoji={data.emoji} className="text-xl" />
                            </span>
                        )}
                        <h4 className="text-white font-semibold truncate">{node.text}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/70">
                        {!isEditable && data?.transactionsCount !== undefined && (
                            <span>
                                {data.transactionsCount} {t('organization.structure.transactionsLabel')}
                            </span>
                        )}
                        {data?.subBommelsCount !== undefined && data.subBommelsCount > 0 && (
                            <span>
                                {data.subBommelsCount} {t('organization.structure.subBommelsLabel')}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right: Financial info */}
                {!isEditable && (
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-[10px] text-white/60">{t('organization.structure.details.income')}</div>
                                <div className="text-sm font-medium text-green-200">{formatCurrency(data?.income)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-white/60">{t('organization.structure.details.expenses')}</div>
                                <div className="text-sm font-medium text-red-200">
                                    {data?.expenses !== undefined ? `-${Math.abs(data.expenses).toLocaleString('de-DE')}€` : '-'}
                                </div>
                            </div>
                        </div>
                        <div className="text-right bg-white/10 rounded-lg px-3 py-2">
                            <div className="text-xs text-white/60 mb-0.5">{t('organization.structure.details.total')}</div>
                            <div
                                className={cn('text-base font-semibold', {
                                    'text-green-200': data?.total !== undefined && data.total >= 0,
                                    'text-red-200': data?.total !== undefined && data.total < 0,
                                    'text-white': data?.total === undefined,
                                })}
                            >
                                {formatCurrency(data?.total)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RootBommelHeader;
