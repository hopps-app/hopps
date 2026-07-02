import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';

interface SortHeaderProps {
    label: string;
    active: boolean;
    direction: 'asc' | 'desc';
    onClick: () => void;
    align?: 'left' | 'right';
}

/**
 * Clickable table-column header used for sorting. Shows an up/down arrow on the active column and a neutral
 * double-arrow hint on inactive ones. Styled to match the prototype table headers.
 */
export function SortHeader({ label, active, direction, onClick, align = 'left' }: SortHeaderProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn('inline-flex items-center gap-1 select-none transition-colors hover:text-[#7E3FB4]', align === 'right' && 'justify-self-end')}
            style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: active ? '#7E3FB4' : '#9A9AA3' }}
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
