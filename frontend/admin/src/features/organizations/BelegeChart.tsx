import { useTranslation } from 'react-i18next';

import { formatDeltaPct, formatNumber } from './format';
import { ChartCard } from './LoginActivityChart';
import type { MonthlySeries } from './types';

/**
 * Belege-per-month bar chart (rolling 6 months) — the "Beleg-Verbrauch" card.
 * The most recent month is drawn in solid brand purple; earlier months in a tint,
 * so the current month is the visual anchor. Headline shows the latest count plus a
 * month-over-month delta badge.
 */
export default function BelegeChart({ series }: { series: MonthlySeries }) {
    const { t } = useTranslation();
    const { points, latest, deltaPct } = series;
    const peak = Math.max(1, ...points.map((p) => p.value));
    const lastIndex = points.length - 1;

    return (
        <ChartCard
            eyebrow={t('organizations.charts.belege.eyebrow')}
            title={t('organizations.charts.belege.title')}
            headline={<span>{formatNumber(latest)}</span>}
            delta={deltaPct !== null ? <DeltaBadge fraction={deltaPct} /> : undefined}
        >
            <div className="flex items-end gap-2 h-[140px]" role="img" aria-label={t('organizations.charts.belege.title')}>
                {points.map((p, i) => (
                    <div key={p.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                        <div className="w-full flex items-end justify-center h-full">
                            <div
                                className="w-full max-w-[26px] rounded-t-[4px]"
                                style={{
                                    height: `${Math.max(4, (p.value / peak) * 100)}%`,
                                    background: i === lastIndex ? 'var(--pp)' : 'var(--pp-tint2)',
                                }}
                                title={`${p.label}: ${formatNumber(p.value)}`}
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
        </ChartCard>
    );
}

/** +23 % / −10 % pill. Green when up, red when down — up-is-good for Belege volume. */
export function DeltaBadge({ fraction }: { fraction: number }) {
    const up = fraction >= 0;
    return (
        <span
            className="tnum text-[12px] font-bold"
            style={{ color: up ? 'var(--pos-ink)' : 'var(--neg-ink)' }}
        >
            {formatDeltaPct(fraction)}
        </span>
    );
}
