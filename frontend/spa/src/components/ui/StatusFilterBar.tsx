import { Fragment } from 'react';

export interface StatusFilterItem<T extends string> {
    id: T;
    label: string;
    count: number;
    /** Count colour while the item is selected. */
    color: string;
    /** Count background while the item is selected. */
    tint: string;
}

/**
 * Status filter: independent toggles with a count each, no "all" segment; nothing selected shows every row. A hairline
 * between the segments reads as one filter group rather than a tab row. Shared by the transactions list and the bank
 * import history.
 */
export function StatusFilterBar<T extends string>({
    items,
    value,
    onChange,
    ariaLabel,
}: {
    items: StatusFilterItem<T>[];
    value: T[];
    onChange: (next: T[]) => void;
    ariaLabel: string;
}) {
    const toggle = (id: T) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    return (
        <div
            role="group"
            aria-label={ariaLabel}
            className="inline-flex h-11 items-center gap-0.5 p-1"
            style={{ background: 'var(--surface-track)', borderRadius: 12 }}
        >
            {items.map((item, index) => {
                const on = value.includes(item.id);
                return (
                    <Fragment key={item.id}>
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
                            onClick={() => toggle(item.id)}
                            className="inline-flex h-9 items-center gap-[7px] px-4 font-bold transition-colors"
                            style={{
                                fontSize: 13.5,
                                borderRadius: 'var(--btn-radius)',
                                color: on ? 'var(--foreground)' : 'var(--muted-foreground)',
                                background: on ? 'var(--background-secondary)' : 'transparent',
                                boxShadow: on ? 'var(--shadow-sm)' : 'none',
                            }}
                        >
                            {item.label}
                            <span
                                className="grid place-items-center rounded-full px-[5px] font-extrabold"
                                style={{
                                    minWidth: 20,
                                    height: 20,
                                    fontSize: 11.5,
                                    background: on ? item.tint : 'color-mix(in oklch, var(--surface-track) 60%, var(--background-secondary))',
                                    color: on ? item.color : 'var(--muted-foreground)',
                                }}
                            >
                                {item.count}
                            </span>
                        </button>
                    </Fragment>
                );
            })}
        </div>
    );
}
