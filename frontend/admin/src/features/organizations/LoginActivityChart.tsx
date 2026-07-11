import { useTranslation } from 'react-i18next';

import type { LoginActivity } from './types';

/**
 * Sessions-per-hour histogram (24 bars, 00:00–24:00) — the "Login-Zeiten" card.
 * Purely presentational; data is a 30-day average from LoginActivity (currently mocked).
 * Bars use the brand purple; the tallest is fully opaque, the rest scale their height
 * relative to the peak so the daily rhythm reads at a glance.
 */
export default function LoginActivityChart({ activity }: { activity: LoginActivity }) {
    const { t } = useTranslation();
    const { hourly } = activity;
    const peak = Math.max(1, ...hourly);

    return (
        <ChartCard
            eyebrow={t('organizations.charts.login.eyebrow')}
            title={t('organizations.charts.login.title')}
            subtitle={t('organizations.charts.login.subtitle')}
        >
            <div className="flex items-end gap-[3px] h-[112px]" role="img" aria-label={t('organizations.charts.login.title')}>
                {hourly.map((v, hour) => (
                    <div
                        key={hour}
                        className="flex-1 rounded-t-[3px]"
                        style={{
                            height: `${Math.max(3, (v / peak) * 100)}%`,
                            background: 'var(--pp)',
                            // Fade quieter hours so the peaks stand out without a second colour.
                            opacity: 0.35 + 0.65 * (v / peak),
                        }}
                        title={`${String(hour).padStart(2, '0')}:00 · ${v}`}
                    />
                ))}
            </div>
            {/* Hour axis: 0 / 6 / 12 / 18 / 24, matching the mockup. */}
            <div className="flex justify-between mt-1.5 text-[11px] text-ink-3 tnum">
                {[0, 6, 12, 18, 24].map((h) => (
                    <span key={h}>{h}</span>
                ))}
            </div>
        </ChartCard>
    );
}

/** Shared card chrome for the activity charts: eyebrow + title + subtitle, then children. */
export function ChartCard({
    eyebrow,
    title,
    subtitle,
    headline,
    delta,
    children,
}: {
    eyebrow: string;
    title: string;
    subtitle?: string;
    headline?: React.ReactNode;
    delta?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="card px-[18px] pt-4 pb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <div className="eyebrow mb-1">{eyebrow}</div>
                    <div className="text-[15px] font-extrabold text-ink leading-tight">{title}</div>
                    {subtitle && <div className="text-[12px] text-ink-2 mt-0.5">{subtitle}</div>}
                </div>
                {(headline || delta) && (
                    <div className="text-right shrink-0">
                        {headline && <div className="tnum text-[19px] font-extrabold text-ink leading-none">{headline}</div>}
                        {delta && <div className="mt-1">{delta}</div>}
                    </div>
                )}
            </div>
            {children}
        </div>
    );
}
