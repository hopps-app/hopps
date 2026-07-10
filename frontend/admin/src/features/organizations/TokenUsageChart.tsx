import { useTranslation } from 'react-i18next';

import { formatNumber } from './format';
import type { AiService, TokenUsage } from './types';

/** Fixed identity → hue mapping. Colours follow the service, never its rank or size.
    Both hues are Klar tokens and validated CVD-separable (ΔE 64.6). */
const SERVICE: Record<AiService, { label: string; color: string }> = {
    openai: { label: 'OpenAI', color: 'var(--pp)' },
    azure: { label: 'Azure AI', color: 'var(--pos)' },
};

/** Stacked bar + legend for per-service AI token usage. */
export default function TokenUsageChart({ usage }: { usage: TokenUsage }) {
    const { t } = useTranslation();

    // Fixed order so a service keeps its colour and position regardless of size.
    const order: AiService[] = ['openai', 'azure'];
    const parts = order
        .map((svc) => ({ svc, value: usage.services[svc] ?? 0 }))
        .filter((p) => p.value > 0);

    const total = usage.total || parts.reduce((a, p) => a + p.value, 0) || 1;

    return (
        <div className="py-3.5">
            <div className="flex items-center justify-between gap-4 mb-2.5">
                <span className="text-[13.5px] font-semibold text-ink-2">{t('organizations.fields.tokenUsage')}</span>
                <span className="tnum text-[14px] font-bold text-ink">{formatNumber(usage.total)}</span>
            </div>

            {/* Stacked bar. 2px surface gap between segments per mark spec. */}
            <div className="flex h-2.5 w-full rounded-full overflow-hidden" style={{ gap: 2, background: 'var(--surface-3)' }}>
                {parts.map((p) => (
                    <div
                        key={p.svc}
                        style={{ width: `${(p.value / total) * 100}%`, background: SERVICE[p.svc].color }}
                        title={`${SERVICE[p.svc].label}: ${formatNumber(p.value)}`}
                    />
                ))}
            </div>

            {/* Legend — identity is never colour-alone: swatch + label + value in ink tokens. */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2.5">
                {parts.map((p) => (
                    <div key={p.svc} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SERVICE[p.svc].color }} />
                        <span className="text-[12px] text-ink-2">{SERVICE[p.svc].label}</span>
                        <span className="tnum text-[12px] font-semibold text-ink">{formatNumber(p.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
