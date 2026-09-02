import type { Bommel } from '@hopps/api-client';
import { Calendar, Network, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ALL_BOMMELS, BommelSelect, BommelSelection } from './BommelSelect';
import { BommelTreeItem, collectSubtreeIds } from './bommelTree';
import { formatCurrency, formatDay } from './format';
import { useIncomeExpenseSeries } from './hooks';
import { IncomeExpenseChart } from './IncomeExpenseChart';
import { DEFAULT_PERIOD, PeriodId, resolvePeriod } from './periods';
import { PeriodSelect } from './PeriodSelect';
import { SectionError, Skeleton } from './SectionState';

import { Card } from '@/components/ui/Card';
import Emoji from '@/components/ui/Emoji';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';

type IncomeExpenseCardProps = {
    organizationId: number | undefined;
    bommels: Bommel[];
    bommelItems: BommelTreeItem[];
    isBommelsLoading: boolean;
};

/**
 * The chart and its two filters. The filters deliberately stay local to this card: the KPI row above
 * is the fixed reference point for the running year, this card is the tool for exploring it.
 */
export function IncomeExpenseCard({ organizationId, bommels, bommelItems, isBommelsLoading }: IncomeExpenseCardProps) {
    const { t, i18n } = useTranslation();

    const [bommel, setBommel] = useState<BommelSelection>(ALL_BOMMELS);
    const [period, setPeriod] = useState<PeriodId>(DEFAULT_PERIOD);

    const range = useMemo(() => resolvePeriod(period), [period]);
    // A parent selection has to carry its children's figures, and the org service matches bommel ids
    // exactly, so the subtree is expanded here.
    const bommelIds = useMemo(() => (bommel === ALL_BOMMELS ? undefined : collectSubtreeIds(bommels, bommel)), [bommel, bommels]);

    const { data, isPending, error, isFetching, refetch } = useIncomeExpenseSeries(organizationId, bommelIds, range);

    const isDefault = bommel === ALL_BOMMELS && period === DEFAULT_PERIOD;
    const selectedBommel = bommel === ALL_BOMMELS ? undefined : bommelItems.find((item) => item.id === bommel);
    const spansYears = range.startDate.slice(0, 4) !== range.endDate.slice(0, 4);

    const reset = () => {
        setBommel(ALL_BOMMELS);
        setPeriod(DEFAULT_PERIOD);
    };

    return (
        <Card
            className="flex min-h-0 flex-1 flex-col gap-0 rounded-[20px] border-border-soft bg-background-secondary px-4 py-5 shadow-card sm:px-6 sm:py-[22px]"
            data-testid="dashboard-income-expense-card"
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <h2 className="text-[17px] font-extrabold">{t('dashboard.incomeExpenseChart')}</h2>
                    <p className="mt-0.5 truncate text-[13px] text-muted-foreground" data-testid="dashboard-chart-subtitle">
                        {formatDay(i18n.language, range.startDate)} – {formatDay(i18n.language, range.endDate)} ·{' '}
                        {selectedBommel ? (
                            <span className="inline-flex items-center gap-1">
                                {selectedBommel.emoji && <Emoji emoji={selectedBommel.emoji} />}
                                {selectedBommel.name}
                            </span>
                        ) : (
                            t('dashboard.bommelSelect.all')
                        )}
                    </p>
                </div>

                <div className="flex w-full flex-wrap items-end gap-2.5 sm:ml-auto sm:w-auto">
                    <div className="flex w-full flex-col gap-1 sm:w-auto">
                        <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-muted-foreground">
                            <Network className="h-3 w-3" aria-hidden="true" />
                            {t('dashboard.bommelFilter')}
                        </span>
                        <BommelSelect items={bommelItems} value={bommel} onChange={setBommel} isLoading={isBommelsLoading} />
                    </div>
                    <div className="flex w-full flex-col gap-1 sm:w-auto">
                        <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-muted-foreground">
                            <Calendar className="h-3 w-3" aria-hidden="true" />
                            {t('dashboard.filterLabel')}
                        </span>
                        <PeriodSelect value={period} onChange={setPeriod} />
                    </div>
                    {!isDefault && (
                        <BaseButton variant="ghost" size="sm" className="h-10 gap-1" onClick={reset} data-testid="dashboard-reset-filter">
                            <X className="h-4 w-4" aria-hidden="true" />
                            {t('dashboard.resetFilter')}
                        </BaseButton>
                    )}
                </div>
            </div>

            {error ? (
                <SectionError
                    error={error}
                    onRetry={() => refetch()}
                    isRetrying={isFetching}
                    className="min-h-[260px] flex-1 justify-center"
                    data-testid="dashboard-chart-error"
                />
            ) : (
                <>
                    <div className="mt-3.5 flex flex-wrap gap-5 text-[13.5px] font-semibold text-muted-foreground">
                        {isPending ? (
                            <>
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-5 w-40" />
                            </>
                        ) : (
                            <>
                                <span>
                                    {t('dashboard.income')}{' '}
                                    <b className="font-extrabold tabular-nums text-foreground" data-testid="dashboard-chart-income">
                                        {formatCurrency(i18n.language, data?.income)}
                                    </b>
                                </span>
                                <span>
                                    {t('dashboard.expenses')}{' '}
                                    <b className="font-extrabold tabular-nums text-foreground" data-testid="dashboard-chart-expenses">
                                        {formatCurrency(i18n.language, data?.expenses)}
                                    </b>
                                </span>
                            </>
                        )}
                    </div>

                    <div className="mt-3 flex min-h-0 flex-1 flex-col">
                        {isPending ? (
                            <Skeleton className="min-h-[200px] w-full flex-1 rounded-xl" />
                        ) : (
                            <IncomeExpenseChart
                                key={`${range.startDate}|${range.endDate}|${bommelIds?.join(',') ?? 'all'}`}
                                data={data?.monthly ?? []}
                                withYear={spansYears}
                            />
                        )}
                    </div>
                </>
            )}
        </Card>
    );
}
