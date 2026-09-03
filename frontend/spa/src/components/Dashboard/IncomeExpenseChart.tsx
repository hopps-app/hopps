import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';

import { formatCurrency, formatMonthLabel } from './format';
import { MonthlyPoint } from './hooks';

type IncomeExpenseChartProps = {
    data: MonthlyPoint[];
    /** Month labels carry the year when the range crosses a year boundary. */
    withYear: boolean;
};

export function IncomeExpenseChart({ data, withYear }: IncomeExpenseChartProps) {
    const { t, i18n } = useTranslation();

    const chartData = data.map((point) => ({
        ...point,
        label: formatMonthLabel(i18n.language, point.monthKey, withYear),
    }));

    const compactAxis = (value: number) => new Intl.NumberFormat(i18n.language, { notation: 'compact', maximumFractionDigits: 1 }).format(value);

    const renderTooltip = ({ active, payload, label }: TooltipContentProps) => {
        if (!active || !payload?.length) {
            return null;
        }
        return (
            <div className="rounded-xl border border-border-soft bg-background-secondary px-3 py-2 text-sm shadow-card">
                <p className="mb-1 font-semibold">{label}</p>
                {payload.map((entry) => (
                    <p key={String(entry.dataKey)} className="flex items-center gap-2 tabular-nums">
                        <span className="h-[10px] w-[10px] shrink-0 rounded-[3px]" style={{ background: entry.color }} aria-hidden="true" />
                        <span className="text-muted-foreground">{entry.name}</span>
                        <span className="ml-auto font-semibold">{formatCurrency(i18n.language, Number(entry.value ?? 0))}</span>
                    </p>
                ))}
            </div>
        );
    };

    return (
        <>
            <div className="min-h-[200px] w-full min-w-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                        <YAxis
                            width={56}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                            tickFormatter={compactAxis}
                        />
                        <Tooltip cursor={false} content={renderTooltip} />
                        <Bar dataKey="income" name={t('dashboard.income')} fill="var(--chart-income)" radius={[3, 3, 0, 0]} maxBarSize={10} />
                        <Bar dataKey="expenses" name={t('dashboard.expenses')} fill="var(--chart-expenses)" radius={[3, 3, 0, 0]} maxBarSize={10} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* The two series differ in lightness as well as hue, but a legend and a text alternative
                keep the chart usable without colour perception at all. */}
            <div className="mt-3 flex flex-wrap gap-5 text-xs font-bold text-muted-foreground">
                <span className="flex items-center gap-2">
                    <i className="h-[11px] w-[11px] rounded-[3px] bg-[var(--chart-income)]" aria-hidden="true" />
                    {t('dashboard.income')}
                </span>
                <span className="flex items-center gap-2">
                    <i className="h-[11px] w-[11px] rounded-[3px] bg-[var(--chart-expenses)]" aria-hidden="true" />
                    {t('dashboard.expenses')}
                </span>
            </div>

            {/* The wrapping div carries `sr-only`, not the table: a table's own caption box sits
                outside the clipped table box and stays visible. It also keeps the table's intrinsic
                width from reaching the surrounding layout. */}
            <div className="sr-only">
                <table>
                    <caption>{t('dashboard.chart.tableCaption')}</caption>
                    <thead>
                        <tr>
                            <th scope="col">{t('dashboard.chart.month')}</th>
                            <th scope="col">{t('dashboard.income')}</th>
                            <th scope="col">{t('dashboard.expenses')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chartData.map((point) => (
                            <tr key={point.monthKey}>
                                <th scope="row">{point.label}</th>
                                <td>{formatCurrency(i18n.language, point.income)}</td>
                                <td>{formatCurrency(i18n.language, point.expenses)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
