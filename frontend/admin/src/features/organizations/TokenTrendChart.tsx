import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { formatCompact } from './format';
import { DeltaBadge } from './BelegeChart';
import { ChartCard } from './LoginActivityChart';
import type { MonthlySeries } from './types';

/**
 * AI-tokens-per-month trend (rolling 6 months) — the "Token-Verbrauch" card.
 * An area line in the warn/amber token (distinct from the purple Belege bars so the two
 * usage stories don't blur together), with a compact headline (`14,2k`) and a MoM delta.
 * Rendered as an inline SVG with a viewBox so it scales to the card width.
 */
export default function TokenTrendChart({ series }: { series: MonthlySeries }) {
    const { t } = useTranslation();
    const gradId = useId();
    const { points, latest, deltaPct } = series;

    const W = 300;
    const H = 140;
    const pad = 8;
    const peak = Math.max(1, ...points.map((p) => p.value));
    const n = points.length;

    // Map each month to an (x, y). x spreads edge-to-edge; y is inverted (SVG y grows down).
    const coords = points.map((p, i) => {
        const x = n > 1 ? pad + (i / (n - 1)) * (W - 2 * pad) : W / 2;
        const y = H - pad - (p.value / peak) * (H - 2 * pad);
        return { x, y };
    });

    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const area = `${line} L ${coords[n - 1].x.toFixed(1)} ${H} L ${coords[0].x.toFixed(1)} ${H} Z`;
    const lastPoint = coords[n - 1];

    return (
        <ChartCard
            eyebrow={t('organizations.charts.tokens.eyebrow')}
            title={t('organizations.charts.tokens.title')}
            headline={<span style={{ color: 'var(--warn)' }}>{formatCompact(latest)}</span>}
            delta={deltaPct !== null ? <DeltaBadge fraction={deltaPct} /> : undefined}
        >
            <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                height={H}
                preserveAspectRatio="none"
                role="img"
                aria-label={t('organizations.charts.tokens.title')}
            >
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--warn)" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="var(--warn)" stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                <path d={area} fill={`url(#${gradId})`} />
                <path d={line} fill="none" stroke="var(--warn)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                {/* Endpoint dot marks the current month. */}
                <circle cx={lastPoint.x} cy={lastPoint.y} r="3.5" fill="var(--warn)" stroke="var(--surface)" strokeWidth="2" />
            </svg>
            <div className="flex justify-between mt-1.5 text-[11px] text-ink-3">
                {points.map((p, i) => (
                    <span key={p.label} className={i === n - 1 ? 'font-bold' : undefined} style={i === n - 1 ? { color: 'var(--warn)' } : undefined}>
                        {p.label}
                    </span>
                ))}
            </div>
        </ChartCard>
    );
}
