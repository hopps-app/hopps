import { Check } from 'lucide-react';
import { useRef, type KeyboardEvent, type ReactNode } from 'react';

import { DIRECTION_ICONS } from '@/components/Transactions/TxIcon';
import { HintTooltip } from '@/components/ui/HintTooltip';
import { cn } from '@/lib/utils';

// Building blocks shared by the transaction drawer and the receipt drawer, so both forms look the same.

// Field label above an input: small, heavy, uppercase.
export const labelCls = 'text-[12px] font-extrabold uppercase tracking-[0.04em] text-[var(--ink-faint)]';
export const inputCls =
    'h-10 w-full rounded-xl border border-border-soft bg-[var(--background-secondary)] px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground transition-shadow focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-surface)]';

// Footer buttons. Height and type size follow the design system's default button.
export const footerBtn = 'h-[42px] gap-2 rounded-[var(--btn-radius)] px-5 text-[14.5px] font-bold';
export const outlineBtn = 'border border-border-soft text-foreground hover:bg-[var(--background-secondary)]';

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-[7px]">
            <span className={labelCls}>{label}</span>
            {children}
        </div>
    );
}

// Direction options of the edit forms; the arrows come from DIRECTION_ICONS so they match the rest of the app.
export const DIRECTIONS = [
    { id: 'expense', Icon: DIRECTION_ICONS.expense, ink: 'var(--negative)', tint: 'var(--negative-surface)' },
    { id: 'income', Icon: DIRECTION_ICONS.income, ink: 'var(--positive)', tint: 'var(--positive-surface)' },
] as const;

export type DirectionId = (typeof DIRECTIONS)[number]['id'];

/**
 * Ausgabe / Einnahme toggle at the top of an edit form: two cards acting as a radio group. The selected card shows the
 * direction colour, a stronger border and a checkmark, so the state does not rely on colour alone. The short
 * explanation ("Geld ausgegeben") sits in a tooltip. Arrow keys switch the selection.
 */
export function DirectionCards({
    value,
    onChange,
    labels,
    hints,
    ariaLabel,
}: {
    value: DirectionId;
    onChange: (id: DirectionId) => void;
    labels: Record<DirectionId, string>;
    hints?: Record<DirectionId, string>;
    ariaLabel: string;
}) {
    const refs = useRef<Partial<Record<DirectionId, HTMLButtonElement | null>>>({});

    function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault();
        const next: DirectionId = value === 'expense' ? 'income' : 'expense';
        onChange(next);
        refs.current[next]?.focus();
    }

    return (
        <div role="radiogroup" aria-label={ariaLabel} onKeyDown={onKeyDown} className="flex gap-2">
            {DIRECTIONS.map(({ id, Icon, ink, tint }) => {
                const on = value === id;
                const card = (
                    <button
                        ref={(el) => {
                            refs.current[id] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        tabIndex={on ? 0 : -1}
                        onClick={() => onChange(id)}
                        className={cn(
                            'flex min-h-[60px] w-full items-center gap-3 rounded-[12px] border px-4 py-3 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                            !on && 'hover:border-[var(--border-strong)] hover:bg-[var(--surface-sunken)]'
                        )}
                        style={{
                            background: on ? tint : 'var(--background-secondary)',
                            borderColor: on ? ink : 'var(--border-soft)',
                            outlineColor: ink,
                        }}
                    >
                        <span
                            className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px]"
                            style={{
                                background: on ? `color-mix(in oklch, ${ink} 14%, ${tint})` : 'var(--surface-sunken)',
                                color: on ? ink : 'var(--ink-faint)',
                            }}
                        >
                            <Icon size={16} />
                        </span>
                        <span className="text-[15px] font-semibold" style={{ color: on ? ink : 'var(--muted-foreground)' }}>
                            {labels[id]}
                        </span>
                        {on && <Check size={16} strokeWidth={2.5} className="ml-auto flex-shrink-0" style={{ color: ink }} />}
                    </button>
                );
                return hints ? (
                    <HintTooltip key={id} content={hints[id]} className="flex-1">
                        {card}
                    </HintTooltip>
                ) : (
                    <div key={id} className="flex flex-1">
                        {card}
                    </div>
                );
            })}
        </div>
    );
}
