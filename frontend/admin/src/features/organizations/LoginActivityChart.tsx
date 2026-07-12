import { useTranslation } from 'react-i18next';

import type { LoginActivity } from './types';

/** Short localised weekday label ("Mo", "Di", …) for an ISO date. de-DE, Klar-consistent. */
function weekday(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    return new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(d).replace(/\.$/, '');
}

/** Fuller label for the tooltip heading ("Mo, 12.07."): weekday + day.month. de-DE. */
function weekdayLong(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    const wd = new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(d).replace(/\.$/, '');
    const date = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(d);
    return `${wd}, ${date}`;
}

/**
 * Logins-per-day bar chart over the last 7 days — the "Login-Aktivität" card.
 * Each bar is the number of members who logged in that day (the backend counts a member
 * once per day, so this is distinct active members, not raw sign-in events). The most
 * recent day is the anchor (solid purple), earlier days a tint. Bars scale against the
 * busiest day in the window; headline shows the latest day's count.
 */
export default function LoginActivityChart({ activity }: { activity: LoginActivity }) {
    const { t } = useTranslation();
    const { days } = activity;
    // Scale against the busiest day in the window so the tallest bar fills the chart.
    const peak = Math.max(1, ...days.map((d) => d.activeUsers));
    const lastIndex = days.length - 1;
    const latest = days[lastIndex]?.activeUsers ?? 0;

    return (
        <ChartCard
            eyebrow={t('organizations.charts.login.eyebrow')}
            title={t('organizations.charts.login.title')}
            subtitle={t('organizations.charts.login.subtitle')}
            headline={<span>{latest}</span>}
        >
            <div className="flex items-end gap-2 h-[112px]" role="img" aria-label={t('organizations.charts.login.title')}>
                {days.map((d, i) => (
                    <div key={d.day} className="group relative flex-1 h-full flex flex-col items-center gap-1.5 min-w-0">
                        <ChartTooltip
                            label={weekdayLong(d.day)}
                            value={t('organizations.charts.login.tooltip', { count: d.activeUsers })}
                        />
                        <div className="w-full flex-1 min-h-0 flex items-end justify-center">
                            <div
                                className="w-full max-w-[28px] rounded-t-[4px] transition-opacity group-hover:opacity-80"
                                style={{
                                    height: `${Math.max(4, (d.activeUsers / peak) * 100)}%`,
                                    background: i === lastIndex ? 'var(--pp)' : 'var(--pp-tint2)',
                                }}
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
                        {headline && <div className="tnum text-[26px] font-extrabold text-ink leading-none">{headline}</div>}
                        {delta && <div className="mt-1">{delta}</div>}
                    </div>
                )}
            </div>
            {children}
        </div>
    );
}

/**
 * Hover tooltip for a bar. Hidden until the enclosing `.group` is hovered, then floats
 * above the bar. Pointer-events are off so it never blocks the hover it depends on.
 * Shared chrome — sits with ChartCard so both bar charts reuse the same look without a
 * circular import.
 */
export function ChartTooltip({ label, value }: { label: string; value: string }) {
    return (
        <div
            className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full z-10
                       whitespace-nowrap rounded-lg px-2.5 py-1.5 text-center shadow-lg
                       opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'var(--ink)' }}
            role="tooltip"
        >
            <div className="text-[11px] font-semibold" style={{ color: 'var(--surface)' }}>
                {label}
            </div>
            <div className="tnum text-[12px] font-bold" style={{ color: 'var(--surface)' }}>
                {value}
            </div>
        </div>
    );
}
