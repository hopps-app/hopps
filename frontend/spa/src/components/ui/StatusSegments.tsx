import { Fragment } from 'react';

export interface StatusSegment<T extends string> {
    id: T;
    label: string;
    count: number;
    /** Badge text color while the segment is selected. */
    color: string;
    /** Badge background while the segment is selected. */
    tint: string;
}

interface StatusSegmentsProps<T extends string> {
    segments: StatusSegment<T>[];
    selected: T[];
    onToggle: (id: T) => void;
    ariaLabel: string;
}

/**
 * Multi-select status filter: independent toggles with a count badge each, no "all" segment. Nothing selected means
 * every status. A hairline between the segments reads as one filter group rather than a tab row.
 */
export function StatusSegments<T extends string>({ segments, selected, onToggle, ariaLabel }: StatusSegmentsProps<T>) {
    return (
        <div
            role="group"
            aria-label={ariaLabel}
            className="inline-flex h-11 items-center gap-0.5 p-1"
            style={{ background: 'var(--surface-track)', borderRadius: 12 }}
        >
            {segments.map((seg, index) => {
                const on = selected.includes(seg.id);
                return (
                    <Fragment key={seg.id}>
                        {index > 0 && (
                            <span
                                aria-hidden="true"
                                className="mx-0.5 my-[7px] w-px self-stretch"
                                style={{ background: 'color-mix(in oklch, var(--muted-foreground) 18%, transparent)' }}
                            />
                        )}
                        <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => onToggle(seg.id)}
                            className="inline-flex h-9 items-center gap-[7px] px-4 font-bold transition-colors"
                            style={{
                                fontSize: 13.5,
                                borderRadius: 'var(--btn-radius)',
                                color: on ? 'var(--foreground)' : 'var(--muted-foreground)',
                                background: on ? 'var(--background-secondary)' : 'transparent',
                                boxShadow: on ? 'var(--shadow-sm)' : 'none',
                            }}
                        >
                            {seg.label}
                            <span
                                className="grid place-items-center rounded-full px-[5px] font-extrabold"
                                style={{
                                    minWidth: 20,
                                    height: 20,
                                    fontSize: 11.5,
                                    background: on ? seg.tint : 'color-mix(in oklch, var(--surface-track) 60%, var(--background-secondary))',
                                    color: on ? seg.color : 'var(--muted-foreground)',
                                }}
                            >
                                {seg.count}
                            </span>
                        </button>
                    </Fragment>
                );
            })}
        </div>
    );
}
