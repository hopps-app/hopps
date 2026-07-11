import { useTranslation } from 'react-i18next';

import type { LoginActivity } from './types';

/** Short localised weekday label ("Mo", "Di", …) for an ISO date. de-DE, Klar-consistent. */
function weekday(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    return new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(d).replace(/\.$/, '');
}

/**
 * Active-members-per-day bar chart over the last 7 days — the "Login-Zeiten" card.
 * Each bar is the number of distinct members who were active that day; the most recent
 * day is the anchor (solid purple), earlier days a tint. Bars scale against the org's
 * total member count so full-team days reach the top. Headline shows today's ratio.
 */
export default function LoginActivityChart({ activity }: { activity: LoginActivity }) {
    const { t } = useTranslation();
    const { totalMembers, days } = activity;
    // Scale against the member total (the natural ceiling), never below the observed peak.
    const observedPeak = Math.max(...days.map((d) => d.activeUsers), 0);
    const peak = Math.max(1, totalMembers, observedPeak);
    const lastIndex = days.length - 1;
    const latest = days[lastIndex]?.activeUsers ?? 0;

    return (
        <ChartCard
            eyebrow={t('organizations.charts.login.eyebrow')}
            title={t('organizations.charts.login.title')}
            subtitle={t('organizations.charts.login.subtitle')}
            headline={
                <span>
                    {latest}
                    <span className="text-[13px] font-bold text-ink-3"> / {totalMembers}</span>
                </span>
            }
        >
            <div className="flex items-end gap-2 h-[112px]" role="img" aria-label={t('organizations.charts.login.title')}>
                {days.map((d, i) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                        <div className="w-full flex items-end justify-center h-full">
                            <div
                                className="w-full max-w-[28px] rounded-t-[4px]"
                                style={{
                                    height: `${Math.max(4, (d.activeUsers / peak) * 100)}%`,
                                    background: i === lastIndex ? 'var(--pp)' : 'var(--pp-tint2)',
                                }}
                                title={`${weekday(d.day)}: ${t('organizations.charts.login.tooltip', { count: d.activeUsers, total: totalMembers })}`}
                            />
                        </div>
                        <span
                            className={`text-[11px] ${i === lastIndex ? 'font-bold' : 'text-ink-3'}`}
                            style={i === lastIndex ? { color: 'var(--pp-ink)' } : undefined}
                        >
                            {weekday(d.day)}
                        </span>
                    </div>
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
