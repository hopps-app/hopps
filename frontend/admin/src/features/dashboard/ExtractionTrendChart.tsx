import { useTranslation } from 'react-i18next';

import { buildAreaPoints, buildPoints, PLOT_HEIGHT, VIEW } from './line';
import type { MonthlyExtraction } from './types';

import { formatNumber } from '@/features/organizations/format';
import { ChartCard, ChartTooltip } from '@/features/organizations/LoginActivityChart';
import type { ExtractionSource } from '@/features/organizations/types';

/**
 * Same identity → colour mapping as the organization detail's all-time breakdown, so a source keeps
 * its colour wherever it appears: purple = the structured/electronic path (ZUGFeRD), amber = the AI
 * path, grey = manual.
 */
const SOURCE: Record<ExtractionSource, { labelKey: string; color: string }> = {
    ZUGFERD: { labelKey: 'organizations.charts.extraction.source.zugferd', color: 'var(--pp)' },
    AI: { labelKey: 'organizations.charts.extraction.source.ai', color: 'var(--warn)' },
    MANUAL: { labelKey: 'organizations.charts.extraction.source.manual', color: 'var(--ink-3)' },
};

/** Fixed series order so a source keeps its colour and legend position regardless of size. */
const ORDER: ExtractionSource[] = ['ZUGFERD', 'AI', 'MANUAL'];

/**
 * "Erfassungswege" trend — one line per extraction method over the last months.
 *
 * The organization detail answers "what does this Verein's whole history look like" with a single
 * stacked bar; this answers a different question, which only a time series can: is ZUGFeRD adoption
 * actually rising, and is AI usage (and therefore cost) growing. An all-time split cannot show a
 * direction.
 *
 * All three lines share one y-scale — they are the same unit and the comparison between them is the
 * point, so scaling each to its own maximum would flatter the small ones and mislead.
 */
export default function ExtractionTrendChart({ months }: { months: MonthlyExtraction[] }) {
    const { t } = useTranslation();

    const peak = Math.max(1, ...months.flatMap((m) => ORDER.map((s) => m.counts[s] ?? 0)));
    const isEmpty = months.length === 0;

    return (
        <ChartCard
            eyebrow={t('organizations.charts.extraction.eyebrow')}
            title={t('organizations.charts.extraction.title')}
            subtitle={t('dashboard.extraction.subtitle')}
        >
            {isEmpty ? (
                <div className={`${PLOT_HEIGHT} grid place-items-center text-[13px] text-ink-3`}>{t('organizations.charts.empty')}</div>
            ) : (
                <>
                    <div className={`relative ${PLOT_HEIGHT}`}>
                        <svg
                            viewBox={`0 0 ${VIEW} ${VIEW}`}
                            preserveAspectRatio="none"
                            className="absolute inset-0 w-full h-full overflow-visible"
                            role="img"
                            aria-label={t('organizations.charts.extraction.title')}
                        >
                            {/* Every tint first, then every line: drawn per-source in one pass, a later
                                source's fill would wash out an earlier source's line. Kept faint because
                                three of them overlap. */}
                            {ORDER.map((source) => (
                                <polygon
                                    key={`area-${source}`}
                                    points={buildAreaPoints(
                                        months.map((m) => m.counts[source] ?? 0),
                                        peak
                                    )}
                                    fill={SOURCE[source].color}
                                    fillOpacity={0.1}
                                />
                            ))}
                            {ORDER.map((source) => (
                                <polyline
                                    key={source}
                                    points={buildPoints(
                                        months.map((m) => m.counts[source] ?? 0),
                                        peak
                                    )}
                                    fill="none"
                                    stroke={SOURCE[source].color}
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    // The viewBox is stretched to the container, which would smear the stroke
                                    // thickness with it; this keeps every line the same visual weight.
                                    vectorEffect="non-scaling-stroke"
                                />
                            ))}
                        </svg>

                        {/* Hover targets sit above the lines: one column per month, so a single tooltip can
                            report all three sources at that point rather than needing per-line hit testing. */}
                        <div className="absolute inset-0 flex">
                            {months.map((m, i) => (
                                <div key={i} className="group relative flex-1">
                                    <ChartTooltip
                                        label={m.label}
                                        value={
                                            <span className="flex flex-col gap-1 mt-0.5">
                                                {ORDER.map((s) => (
                                                    <span key={s} className="flex items-center justify-between gap-4">
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SOURCE[s].color }} />
                                                            <span className="text-[11.5px] font-semibold text-ink-2">{t(SOURCE[s].labelKey)}</span>
                                                        </span>
                                                        <span className="tnum">{formatNumber(m.counts[s] ?? 0)}</span>
                                                    </span>
                                                ))}
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
                                className={`flex-1 min-w-0 text-center text-[10.5px] tnum truncate ${i === months.length - 1 ? 'font-bold' : 'text-ink-3'}`}
                                style={i === months.length - 1 ? { color: 'var(--pp-ink)' } : undefined}
                            >
                                {m.label}
                            </span>
                        ))}
                    </div>

                    {/* Identifies the lines and nothing more — the figures belong to a point in time, so they
                        live in the tooltip where the month they apply to is unambiguous. */}
                    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 mt-3">
                        {ORDER.map((source) => (
                            <span key={source} className="flex items-center gap-2 text-[12.5px]">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SOURCE[source].color }} />
                                <span className="text-ink-2">{t(SOURCE[source].labelKey)}</span>
                            </span>
                        ))}
                    </div>
                </>
            )}
        </ChartCard>
    );
}
