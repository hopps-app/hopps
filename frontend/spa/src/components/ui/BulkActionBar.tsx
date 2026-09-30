import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Bar shown above a table while rows are ticked: how many are selected, a link to clear the selection and, on the
 * right, the bulk actions (`children`, typically BaseButtons with `size="sm"`).
 */
export function BulkActionBar({
    label,
    clearLabel,
    onClear,
    className,
    children,
}: {
    label: string;
    clearLabel: string;
    onClear: () => void;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            className={cn('flex items-center gap-3 rounded-[14px] border px-4 py-2.5', className)}
            style={{ background: 'var(--accent-surface)', borderColor: 'var(--purple-200)' }}
        >
            <span className="text-[13.5px] font-bold text-foreground">{label}</span>
            <button type="button" onClick={onClear} className="text-[13px] font-semibold text-purple-700 hover:text-purple-900 transition-colors">
                {clearLabel}
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">{children}</div>
        </div>
    );
}
