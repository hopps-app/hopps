import type { LucideIcon } from 'lucide-react';

import { buildAreaPoints, buildPoints, VIEW, yFor } from './line';

/**
 * One Kennzahl: label and icon, the figure with its change beside it, a sparkline, and the line of
 * context that says what the change is measured against.
 *
 * The sparkline carries no axis or scale on purpose — at this size it shows direction, and the
 * readable figures live in the charts below.
 */
export default function StatCard({
    label,
    icon: Icon,
    value,
    change,
    changeTone = 'neutral',
    footer,
    series,
    color = 'var(--pp)',
}: {
    label: string;
    icon: LucideIcon;
    value: string;
    /** Small qualifier beside the figure — a delta, or a share. */
    change?: string;
    changeTone?: 'positive' | 'negative' | 'neutral';
    /** What the change is measured against. */
    footer: string;
    /** Recent history, oldest first. Hidden when there is no shape to show. */
    series: number[];
    /** Line colour, so a card can carry the colour of the series it belongs to. */
    color?: string;
}) {
    const peak = Math.max(...series, 0);
    // A flat line at zero is noise dressed up as information, so draw nothing until there is a shape.
    const hasShape = series.length > 1 && peak > 0;
    const last = series[series.length - 1] ?? 0;
    // Where the line ends, as a percentage down the box — used to pin the end dot without an SVG
    // circle, which the stretched viewBox would squash into an ellipse.
    const endY = (yFor(last, peak) / VIEW) * 100;

    const changeColor =
        changeTone === 'positive' ? 'var(--pos-ink)' : changeTone === 'negative' ? 'var(--neg-ink)' : 'var(--ink-3)';

    return (
        <div className="card px-[18px] py-4 h-full flex flex-col">
            <div className="flex items-start justify-between gap-3">
                <span className="text-[13.5px] font-semibold text-ink-2 min-w-0 truncate">{label}</span>
                <span
                    className="shrink-0 w-8 h-8 rounded-[10px] grid place-items-center"
                    style={{ background: 'var(--pp-tint2)', color: 'var(--pp-ink)' }}
                >
                    <Icon size={16} />
                </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2.5">
                <span className="tnum text-[28px] font-extrabold text-ink leading-none">{value}</span>
                {change && (
                    <span className="tnum text-[12.5px] font-bold" style={{ color: changeColor }}>
                        {change}
                    </span>
                )}
            </div>

            {/* Takes whatever height is left, so the card fills its row rather than huddling at the top. */}
            <div className="relative flex-1 min-h-[24px] mt-2">
                {hasShape && (
                    <>
                        <svg
                            viewBox={`0 0 ${VIEW} ${VIEW}`}
                            preserveAspectRatio="none"
                            className="absolute inset-0 w-full h-full"
                            aria-hidden="true"
                        >
                            <polygon points={buildAreaPoints(series, peak)} fill={color} fillOpacity={0.14} />
                            <polyline
                                points={buildPoints(series, peak)}
                                fill="none"
                                stroke={color}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                        </svg>
                        <span
                            className="absolute w-2 h-2 rounded-full"
                            style={{ right: 0, top: `${endY}%`, transform: 'translate(50%, -50%)', background: color }}
                        />
                    </>
                )}
            </div>

            <span className="text-[12.5px] text-ink-3 mt-2 truncate">{footer}</span>
        </div>
    );
}
