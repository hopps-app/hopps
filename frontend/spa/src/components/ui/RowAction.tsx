import { ChevronRight } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';

import { cn } from '@/lib/utils';

const ROW_ACTION =
    'inline-flex h-[34px] flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--btn-radius)] px-3.5 text-[13px] font-bold transition-colors';
const VARIANT = {
    // Open work ("Prüfen", "Zuordnen").
    primary: 'bg-[var(--purple-100)] text-[var(--purple-700)] hover:bg-[var(--purple-200)]',
    // An item that is already done and only opened to look at or change it ("Ansehen").
    neutral: 'bg-[var(--surface-track)] text-muted-foreground hover:bg-[var(--surface-sunken)] hover:text-foreground',
};

/**
 * The row action that opens an open item in a drawer, the same on every list: a small tonal button with a chevron and a
 * concrete verb ("Prüfen", "Zuordnen"). `neutral` is the quieter variant for items that are already done ("Ansehen").
 * Inside a row that is itself a button, pass `asLabel` so it renders as a styled span (no nested button) and the row's
 * own click opens the drawer.
 */
export function RowAction({
    children,
    onClick,
    asLabel = false,
    variant = 'primary',
    className,
}: {
    children: ReactNode;
    onClick?: (e: MouseEvent) => void;
    asLabel?: boolean;
    variant?: keyof typeof VARIANT;
    className?: string;
}) {
    const content = (
        <>
            {children}
            <ChevronRight size={15} />
        </>
    );
    if (asLabel) {
        return <span className={cn(ROW_ACTION, VARIANT[variant], className)}>{content}</span>;
    }
    return (
        <button type="button" onClick={onClick} className={cn(ROW_ACTION, VARIANT[variant], className)}>
            {content}
        </button>
    );
}
