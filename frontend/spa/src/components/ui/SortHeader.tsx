import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';

interface SortHeaderProps {
    label: string;
    active: boolean;
    direction: 'asc' | 'desc';
    onClick: () => void;
    align?: 'left' | 'right';
    /** `klar` matches the design system's table header (12px, .04em tracking, secondary ink); `default` is the compact one. */
    variant?: 'default' | 'klar';
}

/**
 * Clickable table-column header used for sorting. Shows an up/down arrow on the active column and a neutral
 * double-arrow hint on inactive ones. Styled to match the prototype table headers.
 */
export function SortHeader({ label, active, direction, onClick, align = 'left', variant = 'default' }: SortHeaderProps) {
    const klar = variant === 'klar';
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn('inline-flex items-center gap-1 select-none transition-colors hover:text-purple-700', align === 'right' && 'justify-self-end')}
            style={{
                fontSize: klar ? 12 : 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: klar ? '0.04em' : '0.07em',
                color: active ? 'var(--purple-700)' : klar ? 'var(--muted-foreground)' : 'var(--ink-faint)',
            }}
        >
            {label}
            {active ? (
                direction === 'asc' ? (
                    <ArrowUp size={12} strokeWidth={2.5} />
                ) : (
                    <ArrowDown size={12} strokeWidth={2.5} />
                )
            ) : (
                <ArrowUpDown size={12} className="opacity-40" />
            )}
        </button>
    );
}
