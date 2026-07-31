import { useTranslation } from 'react-i18next';

import { formatNumber } from '@/features/organizations/format';
import { ChartCard, ChartTooltip } from '@/features/organizations/LoginActivityChart';
import type { MonthlyPoint } from '@/features/organizations/types';

import { buildAreaPoints, buildPoints, isLabelled, PLOT_HEIGHT, VIEW } from './line';

/**
 * "Vereine gesamt" tile — how the estate grew, as a running total per month.
 *
 * The backend supplies registrations *per month*; the line is the running total behind them, walked
 * backwards from today's count so the last point is exactly `total`. That makes the line answer the
 * question the title asks. Each month's own intake is still available on hover.
 *
 * One caveat inherited from the query: soft-deleted Vereine are excluded throughout, so this is
 * "the Vereine that exist today, by when they joined" rather than a historical record of how many
 * existed at the time.
 */
export default function SignupsChart({ total, months }: { total: number; months: MonthlyPoint[] }) {
    const { t } = useTranslation();

    // Walk backwards from the current count: the total at the end of a month is the next month's
    // total minus what joined during that next month.
    const cumulative: number[] = new Array(months.length);
    let running = total;
    for (let i = months.length - 1; i >= 0; i--) {
        cumulative[i] = running;
        running -= months[i].value;
    }

    const peak = Math.max(1, ...cumulative);

    return (
        <ChartCard
            eyebrow={t('dashboard.signups.eyebrow')}
            title={t('dashboard.signups.title')}
            subtitle={t('dashboard.signups.subtitle')}
            headline={<span>{formatNumber(total)}</span>}
        >
            {months.length === 0 ? (
                <div className={`${PLOT_HEIGHT} grid place-items-center text-[13px] text-ink-3`}>{t('organizations.charts.empty')}</div>
            ) : (
                <>
                    <div className={`relative ${PLOT_HEIGHT}`}>
                        <svg
                            viewBox={`0 0 ${VIEW} ${VIEW}`}
                            preserveAspectRatio="none"
                            className="absolute inset-0 w-full h-full overflow-visible"
                            role="img"
                            aria-label={t('dashboard.signups.title')}
                        >
                            <polygon points={buildAreaPoints(cumulative, peak)} fill="var(--pp)" fillOpacity={0.14} />
                            <polyline
                                points={buildPoints(cumulative, peak)}
                                fill="none"
                                stroke="var(--pp)"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                        </svg>

                        <div className="absolute inset-0 flex">
                            {months.map((m, i) => (
                                <div key={i} className="group relative flex-1">
                                    <ChartTooltip
                                        label={m.label}
                                        value={
                                            <span className="flex flex-col gap-0.5">
                                                <span>{formatNumber(cumulative[i])}</span>
                                                <span className="text-[11.5px] font-semibold text-ink-2">
                                                    {t('dashboard.signups.tooltip', { count: m.value })}
                                                </span>
                                            </span>
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex mt-1.5">
                        {months.map((m, i) => (
                            <span
                                key={i}
                                className={`flex-1 min-w-0 text-center text-[10.5px] tnum truncate ${
                                    i === months.length - 1 ? 'font-bold' : 'text-ink-3'
                                }`}
                                style={i === months.length - 1 ? { color: 'var(--pp-ink)' } : undefined}
                            >
                                {isLabelled(i, months.length) ? m.label : ' '}
                            </span>
                        ))}
                    </div>
                </>
            )}
        </ChartCard>
    );
}
