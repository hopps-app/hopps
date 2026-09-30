import { Check, ChevronRight, FileText, Minus } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils';

// Building blocks of the list tables (transactions, receipts). Each page owns its column template; header and rows
// must be given the same one so the columns line up.

const FONT = '"Hanken Grotesk", "Reddit Sans", sans-serif';

// Trailing column holding the row arrow; appended to every column template so pages don't have to.
export const ARROW_COLUMN = '16px';

// Gap between the table columns; with the 20px padding of header and rows it replaces the per-cell right padding.
const GRID_GAP = 16;

// Table column header text (static columns; the sortable ones use SortHeader's `klar` variant, which matches this).
const HEADER_CELL = {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--muted-foreground)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
} as const;

const gridStyle = (columns: string): CSSProperties => ({ gridTemplateColumns: `${columns} ${ARROW_COLUMN}`, columnGap: GRID_GAP, fontFamily: FONT });

/** Card around header and rows. */
export function DataTable({ children }: { children: ReactNode }) {
    return (
        <div
            className="rounded-[var(--r-card)] border border-border-soft overflow-hidden"
            style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}
        >
            {children}
        </div>
    );
}

export function DataTableHeader({ columns, children }: { columns: string; children: ReactNode }) {
    return (
        <div className="grid items-center border-b border-border-soft" style={{ ...gridStyle(columns), padding: '12px 20px' }}>
            {children}
            <span />
        </div>
    );
}

/** Static (not sortable) column header. */
export function HeaderCell({ children }: { children: ReactNode }) {
    return <span style={HEADER_CELL}>{children}</span>;
}

/** Clickable row; highlighted while it is open in the drawer or ticked for a bulk action. */
export function DataTableRow({ columns, highlighted, onClick, children }: { columns: string; highlighted: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            onClick={onClick}
            data-highlighted={highlighted}
            className="group/row w-full grid items-center text-left border-b border-border-soft last:border-b-0 transition-colors"
            style={{ ...gridStyle(columns), padding: '14px 20px', background: highlighted ? 'var(--accent-surface)' : undefined }}
            onMouseEnter={(e) => {
                if (!highlighted) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-sunken)';
            }}
            onMouseLeave={(e) => {
                if (!highlighted) (e.currentTarget as HTMLButtonElement).style.background = '';
            }}
        >
            {children}
            <ChevronRight size={16} className="text-[var(--ink-faint)]" />
        </button>
    );
}

/**
 * Bulk-select checkbox for a row or, with `mixed`, the select-all in the header. Stops propagation so ticking a row
 * doesn't open the drawer.
 */
export function RowCheckbox({ checked, onToggle, ariaLabel }: { checked: boolean | 'mixed'; onToggle: () => void; ariaLabel: string }) {
    return (
        <span
            role="checkbox"
            aria-checked={checked === 'mixed' ? 'mixed' : checked}
            aria-label={ariaLabel}
            tabIndex={0}
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggle();
                }
            }}
            className={cn(
                'w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-colors',
                checked ? 'bg-primary border-primary' : 'border-[var(--border-strong)] hover:border-primary'
            )}
        >
            {checked === 'mixed' ? (
                <Minus className="w-3 h-3 text-white" strokeWidth={3} />
            ) : checked ? (
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
            ) : null}
        </span>
    );
}

/** Stands in for the table when there is nothing to show. */
export function DataTableEmpty({ title, description }: { title: string; description?: string }) {
    return (
        <div
            className="flex flex-col items-center justify-center py-20 text-center rounded-[var(--r-card)] border border-border-soft"
            style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-sm)' }}
        >
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--accent-surface)' }}>
                <FileText size={26} className="text-primary" />
            </div>
            <p className="font-bold text-foreground" style={{ fontSize: 16 }}>
                {title}
            </p>
            {description && <p className="mt-1 text-[13.5px] text-muted-foreground">{description}</p>}
        </div>
    );
}
