import { useTranslation } from 'react-i18next';

import { ABGLEICH_COLUMNS } from '@/components/BankAccounts/kontenLayout';
import { Skeleton } from '@/components/Dashboard/SectionState';
import { cn } from '@/lib/utils';

// Placeholders in the shape of the Konten page, not a spinner: tables, the account pills and the tab bar keep their
// layout while the data arrives, so nothing jumps once it does. Same primitive as the transactions and dashboard
// skeletons.

/** One cell of a placeholder row, by what the real cell holds. */
export type SkeletonCell = 'date' | 'text' | 'twoLines' | 'amount' | 'number' | 'pill' | 'button' | 'bar' | 'icon';

function Cell({ kind }: { kind: SkeletonCell }) {
    switch (kind) {
        case 'date':
            return <Skeleton className="h-3.5 w-20" />;
        case 'text':
            return <Skeleton className="h-3.5 w-24" />;
        case 'twoLines':
            return (
                <span className="flex min-w-0 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </span>
            );
        case 'amount':
            return <Skeleton className="h-3.5 w-20 justify-self-end" />;
        case 'number':
            return <Skeleton className="h-3.5 w-8 justify-self-end" />;
        case 'pill':
            return <Skeleton className="h-6 w-24 justify-self-center rounded-full" />;
        case 'button':
            return <Skeleton className="h-[34px] w-24 justify-self-end rounded-[var(--btn-radius)]" />;
        case 'bar':
            return (
                <span className="flex flex-col items-end gap-1.5">
                    <Skeleton className="h-3.5 w-10" />
                    <Skeleton className="h-[5px] w-[84px] rounded-full" />
                </span>
            );
        case 'icon':
            return <Skeleton className="h-[34px] w-[34px] justify-self-end rounded-[11px]" />;
    }
}

/**
 * Table placeholder for the Konten tables. Reads the same column template as the real header and rows, so the columns
 * line up; `cells` describes each column of a row.
 */
export function KontenTableSkeleton({
    columns,
    cells,
    rows = 8,
    minWidth,
    className,
}: {
    columns: string;
    cells: SkeletonCell[];
    rows?: number;
    minWidth?: number;
    className?: string;
}) {
    const { t } = useTranslation();
    const grid = { gridTemplateColumns: columns, minWidth };
    return (
        <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            className={cn('overflow-hidden rounded-[var(--r-card)]', className)}
            style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}
        >
            <span className="sr-only">{t('common.loading')}</span>
            <div className="grid items-center gap-3 border-b border-border-soft px-5 py-3" style={grid}>
                {cells.map((_, i) => (
                    <Skeleton key={i} className="h-3 w-16" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, row) => (
                <div key={row} className="grid items-center gap-3 border-b border-border-soft px-5 py-[14px] last:border-b-0" style={grid}>
                    {cells.map((kind, i) => (
                        <Cell key={i} kind={kind} />
                    ))}
                </div>
            ))}
        </div>
    );
}

/**
 * Whole-page placeholder while the page's code or the accounts load: title, account pills, tab bar and the Abgleich
 * table (the default tab).
 */
export function KontenPageSkeleton() {
    return (
        <div className="flex w-full flex-col gap-6">
            <Skeleton className="h-8 w-32" />
            <div className="flex flex-wrap items-center gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-56 rounded-2xl" />
                ))}
            </div>
            <Skeleton className="h-9 w-80 rounded-xl" />
            <KontenTableSkeleton columns={ABGLEICH_COLUMNS} cells={['date', 'text', 'twoLines', 'amount', 'pill', 'button']} />
        </div>
    );
}
