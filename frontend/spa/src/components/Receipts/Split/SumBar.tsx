import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

export interface SumSegment {
    key: string;
    value: number;
    color: string;
    title: string;
}

/**
 * "{value} von {total} €" with a message on the right and a bar with one segment per part. Used for the distribution
 * while editing (how much of the receipt is assigned) and for the bank coverage in the read view. Clicking a segment
 * selects that part when `onSelect` is given.
 */
export function SumBar({
    value,
    total,
    ok,
    message,
    segments,
    activeKey,
    onSelect,
    tone = 'neutral',
    footer,
}: {
    value: string;
    total: string;
    ok: boolean;
    message: ReactNode;
    segments: SumSegment[];
    activeKey?: string | null;
    onSelect?: (key: string) => void;
    tone?: 'neutral' | 'warn';
    footer?: ReactNode;
}) {
    const sum = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
    const base = Math.max(sum, 0.000001);
    return (
        <div
            className="flex flex-col gap-2 rounded-[12px] px-3.5 py-3"
            style={{ background: tone === 'warn' ? 'var(--warning-surface)' : 'var(--surface-sunken)' }}
        >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 tabular-nums">
                <span className="text-[16.5px] font-extrabold text-foreground">
                    {value} <span className="font-semibold text-muted-foreground">{total}</span>
                </span>
                <span
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold"
                    style={{ color: ok ? 'var(--positive)' : tone === 'warn' ? 'var(--warning)' : 'var(--muted-foreground)' }}
                >
                    {ok && <Check size={14} />}
                    {message}
                </span>
            </div>
            <div
                className="flex h-1.5 gap-0.5 overflow-hidden rounded-full"
                style={{ background: tone === 'warn' ? 'color-mix(in oklch, var(--warning) 18%, white)' : 'var(--background-secondary)' }}
            >
                {segments.map(
                    (seg) =>
                        seg.value > 0 && (
                            <button
                                key={seg.key}
                                type="button"
                                title={seg.title}
                                aria-label={seg.title}
                                onClick={onSelect ? () => onSelect(seg.key) : undefined}
                                tabIndex={onSelect ? 0 : -1}
                                className="h-full border-0 p-0 transition-[width,opacity] duration-200"
                                style={{
                                    width: `${(seg.value / base) * 100}%`,
                                    background: seg.color,
                                    cursor: onSelect ? 'pointer' : 'default',
                                    opacity: activeKey == null || activeKey === seg.key ? 1 : 0.45,
                                }}
                            />
                        )
                )}
            </div>
            {footer}
        </div>
    );
}
