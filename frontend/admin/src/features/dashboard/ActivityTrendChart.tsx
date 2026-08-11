import { useTranslation } from 'react-i18next';

import { buildAreaPoints, buildPoints, isLabelled, PLOT_HEIGHT, VIEW } from './line';

import { formatDuration } from '@/features/organizations/format';
import { ChartCard, ChartTooltip } from '@/features/organizations/LoginActivityChart';
import type { DailyActivity } from '@/features/organizations/types';

/** Short axis label for a day: `05.07`. de-DE, like the other formatters. */
function dayLabel(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(d);
}

/** Fuller label for the tooltip heading: `Mo, 05.07.` */
function dayLabelLong(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(d).replace(/\.$/, '');
    return `${weekday}, ${dayLabel(iso)}`;
}

/**
 * "Zeit in der Anwendung" trend — total time across the whole estate, per day.
 *
 * Each point is every member of every Verein added together, so a day routinely exceeds 24 hours:
 * it is combined member time, not wall-clock time the product was in use. Deliberately no headline
 * figure — the shape of the trend is the message, and any single number pinned beside it would
 * either duplicate a point already on the chart or flatten the whole window into one total.
 *
 * It measures presence, not output — read alongside the Beleg figures, not instead of them.
 */
export default function ActivityTrendChart({ days }: { days: DailyActivity[] }) {
    const { t } = useTranslation();

    const values = days.map((d) => d.activeSeconds);
    const peak = Math.max(1, ...values);

    return (
        <ChartCard
            eyebrow={t('dashboard.activity.eyebrow')}
            title={t('dashboard.activity.title')}
            subtitle={t('dashboard.activity.subtitle', { count: days.length })}
        >
            {days.length === 0 ? (
                <div className={`${PLOT_HEIGHT} grid place-items-center text-[13px] text-ink-3`}>{t('organizations.charts.empty')}</div>
            ) : (
                <>
                    <div className={`relative ${PLOT_HEIGHT}`}>
                        <svg
                            viewBox={`0 0 ${VIEW} ${VIEW}`}
                            preserveAspectRatio="none"
                            className="absolute inset-0 w-full h-full overflow-visible"
                            role="img"
                            aria-label={t('dashboard.activity.title')}
                        >
                            {/* Tint under the line, so the area reads as volume rather than just a path. */}
                            <polygon points={buildAreaPoints(values, peak)} fill="var(--pp)" fillOpacity={0.14} />
                            <polyline
                                points={buildPoints(values, peak)}
                                fill="none"
                                stroke="var(--pp)"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                        </svg>

                        {/* One hover column per day, above the line, so every point is reachable. */}
                        <div className="absolute inset-0 flex">
                            {days.map((d) => (
                                <div key={d.day} className="group relative flex-1">
                                    <ChartTooltip label={dayLabelLong(d.day)} value={formatDuration(d.activeSeconds)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* A month of days is far too many to label individually, so only every few carry one. */}
                    <div className="flex mt-1.5">
                        {days.map((d, i) => (
                            <span
                                key={d.day}
                                className={`flex-1 min-w-0 text-center text-[10.5px] tnum truncate ${i === days.length - 1 ? 'font-bold' : 'text-ink-3'}`}
                                style={i === days.length - 1 ? { color: 'var(--pp-ink)' } : undefined}
                            >
                                {isLabelled(i, days.length) ? dayLabel(d.day) : ' '}
                            </span>
                        ))}
                    </div>
                </>
            )}
        </ChartCard>
    );
}
