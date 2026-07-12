import { useTranslation } from 'react-i18next';

import { formatNumber } from './format';
import { ChartCard } from './LoginActivityChart';
import type { ExtractionBreakdown, ExtractionSource } from './types';

/**
 * Fixed identity → colour + i18n-key mapping for extraction methods. Colour follows the
 * method, never its rank or size. Purple = the structured/electronic path (ZUGFeRD),
 * warn/amber = the AI path (Azure), grey = manual — visually separable and CVD-safe.
 * Labels go through i18n (ZUGFeRD/Azure are product names, but "manual" must translate).
 */
const SOURCE: Record<ExtractionSource, { labelKey: string; color: string }> = {
    ZUGFERD: { labelKey: 'organizations.charts.extraction.source.zugferd', color: 'var(--pp)' },
    AI: { labelKey: 'organizations.charts.extraction.source.ai', color: 'var(--warn)' },
    MANUAL: { labelKey: 'organizations.charts.extraction.source.manual', color: 'var(--ink-3)' },
};

/** Fixed render order so a method keeps its colour and position regardless of size. */
const ORDER: ExtractionSource[] = ['ZUGFERD', 'AI', 'MANUAL'];

/**
 * "Beleg-Auslese" card — how the org's documents were extracted (ZUGFeRD / Azure AI /
 * manual), all-time. A single stacked bar over the whole set, plus a legend where each
 * row is the method name, its share (%), and the document count. No time window, no
 * subtitle, no headline badge — just the distribution.
 */
export default function ExtractionChart({ breakdown }: { breakdown: ExtractionBreakdown }) {
    const { t } = useTranslation();

    const total = breakdown.total || 1;
    const parts = ORDER.map((src) => ({ src, value: breakdown.counts[src] ?? 0 })).filter((p) => p.value > 0);
    const isEmpty = breakdown.total <= 0 || parts.length === 0;

    return (
        <ChartCard eyebrow={t('organizations.charts.extraction.eyebrow')} title={t('organizations.charts.extraction.title')}>
            {isEmpty ? (
                <div className="h-[92px] grid place-items-center text-[13px] text-ink-3">
                    {t('organizations.charts.empty')}
                </div>
            ) : (
                <>
                    {/* Stacked bar. 2px surface gap between segments per mark spec. */}
                    <div
                        className="flex h-2.5 w-full rounded-full overflow-hidden"
                        style={{ gap: 2, background: 'var(--surface-3)' }}
                        role="img"
                        aria-label={t('organizations.charts.extraction.title')}
                    >
                        {parts.map((p) => (
                            <div
                                key={p.src}
                                style={{ width: `${(p.value / total) * 100}%`, background: SOURCE[p.src].color }}
                                title={`${t(SOURCE[p.src].labelKey)}: ${formatNumber(p.value)}`}
                            />
                        ))}
                    </div>

                    {/* Legend: dot + name (no subtitle) · percent (bold) · count (muted). */}
                    <div className="mt-4">
                        {parts.map((p, i) => (
                            <div
                                key={p.src}
                                className="flex items-center gap-3 py-2.5"
                                style={{ borderBottom: i === parts.length - 1 ? 'none' : '1px solid var(--line)' }}
                            >
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SOURCE[p.src].color }} />
                                <span className="text-[14px] font-semibold text-ink min-w-0 truncate flex-1">
                                    {t(SOURCE[p.src].labelKey)}
                                </span>
                                <span className="tnum text-[14px] font-bold text-ink shrink-0">
                                    {Math.round((p.value / total) * 100)} %
                                </span>
                                <span className="tnum text-[13px] text-ink-3 shrink-0 w-10 text-right">
                                    {formatNumber(p.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </ChartCard>
    );
}
