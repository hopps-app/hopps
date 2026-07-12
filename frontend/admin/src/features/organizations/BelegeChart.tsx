import { useTranslation } from 'react-i18next';

import { formatDeltaPct, formatNumber } from './format';
import { ChartCard, ChartTooltip } from './LoginActivityChart';
import type { MonthlySeries } from './types';

/**
 * Belege-per-month bar chart (rolling 6 months) — the "Beleg-Verbrauch" card.
 * The most recent month is drawn in solid brand purple; earlier months in a tint,
 * so the current month is the visual anchor. Headline shows the org's total Belege
 * count (all-time, not just the window) plus a month-over-month delta badge; each bar
 * reveals its month and count on hover.
 */
export default function BelegeChart({ series, total }: { series: MonthlySeries; total: number }) {
    const { t } = useTranslation();
    const { points, deltaPct } = series;
    const peak = Math.max(1, ...points.map((p) => p.value));
    const lastIndex = points.length - 1;
    const isEmpty = points.length === 0;

    return (
        <ChartCard
            eyebrow={t('organizations.charts.belege.eyebrow')}
            title={t('organizations.charts.belege.title')}
            headline={<span>{formatNumber(total)}</span>}
            delta={deltaPct !== null ? <DeltaBadge fraction={deltaPct} /> : undefined}
        >
            {isEmpty ? (
                <div className="h-[140px] grid place-items-center text-[13px] text-ink-3">
                    {t('organizations.charts.empty')}
                </div>
            ) : (
            <div className="flex items-end gap-2 h-[140px]" role="img" aria-label={t('organizations.charts.belege.title')}>
                {points.map((p, i) => (
                    <div key={i} className="group relative flex-1 h-full flex flex-col items-center gap-1.5 min-w-0">
                        <ChartTooltip label={p.label} value={t('organizations.charts.belege.tooltip', { count: p.value })} />
                        <div className="w-full flex-1 min-h-0 flex items-end justify-center">
                            <div
                                className="w-full max-w-[26px] rounded-t-[4px] transition-opacity group-hover:opacity-80"
                                style={{
                                    height: `${Math.max(4, (p.value / peak) * 100)}%`,
                                    background: i === lastIndex ? 'var(--pp)' : 'var(--pp-tint2)',
                                }}
                            />
                        </div>
                        <span
                            className={`text-[11px] tnum ${i === lastIndex ? 'font-bold' : 'text-ink-3'}`}
                            style={i === lastIndex ? { color: 'var(--pp-ink)' } : undefined}
                        >
                            {p.label}
                        </span>
                    </div>
                ))}
            </div>
            )}
        </ChartCard>
    );
}

/** +23 % / −10 % pill. Green when up, red when down — up-is-good for Belege volume. */
export function DeltaBadge({ fraction }: { fraction: number }) {
    const up = fraction >= 0;
    return (
        <span
            className="tnum text-[13.5px] font-bold"
            style={{ color: up ? 'var(--pos-ink)' : 'var(--neg-ink)' }}
        >
            {formatDeltaPct(fraction)}
        </span>
    );
}
