import { useTranslation } from 'react-i18next';

import { DOC_GRID, DOC_GRID_NARROW } from './layout';

import { Skeleton } from '@/components/Dashboard/SectionState';
import { FONT, TX_GRID_GAP } from '@/components/Transactions/layout';
import { ARROW_COLUMN } from '@/components/ui/DataTable';

// Placeholders in the shape of the Belege page instead of a spinner, with the same primitive as the transactions and
// dashboard skeletons, so the layout does not jump once the data arrives.

/** Table placeholder. Reads the same column template as the header and the rows, so the columns line up. */
export function ReceiptsTableSkeleton({ hideBommel }: { hideBommel: boolean }) {
    const { t } = useTranslation();
    const columns = { gridTemplateColumns: `${hideBommel ? DOC_GRID_NARROW : DOC_GRID} ${ARROW_COLUMN}`, columnGap: TX_GRID_GAP, fontFamily: FONT };

    return (
        <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            data-testid="receipts-skeleton"
            className="rounded-[var(--r-card)] border border-border-soft overflow-hidden"
            style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}
        >
            <span className="sr-only">{t('common.loading')}</span>

            <div className="grid items-center border-b border-border-soft" style={{ ...columns, padding: '12px 20px' }}>
                <Skeleton className="h-5 w-5 rounded-md" />
                {Array.from({ length: hideBommel ? 4 : 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-3 w-20" />
                ))}
                <Skeleton className="h-3 w-16 justify-self-end" />
            </div>

            {Array.from({ length: 8 }).map((_, row) => (
                <div key={row} className="grid items-center border-b border-border-soft last:border-b-0" style={{ ...columns, padding: '14px 20px' }}>
                    <Skeleton className="h-5 w-5 rounded-md" />
                    <span className="flex items-center gap-3 min-w-0">
                        <Skeleton className="h-9 w-9 rounded-[10px]" />
                        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <Skeleton className="h-3.5 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </span>
                    </span>
                    {!hideBommel && <Skeleton className="h-3.5 w-24" />}
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-4 w-20 justify-self-end" />
                </div>
            ))}
        </div>
    );
}

/**
 * Stands in for the whole page while its route chunk loads: heading, upload card, status tabs with search, table.
 * Lives outside the view so rendering it does not pull the view's chunk in.
 */
export function ReceiptsSkeleton() {
    return (
        <div className="flex flex-col w-full" style={{ fontFamily: FONT }} data-testid="receipts-page-skeleton">
            <div className="mb-5">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="mt-2 h-3.5 w-72" />
            </div>

            <Skeleton className="mb-4 h-[76px] w-full rounded-[18px]" />

            <div className="mb-3 flex flex-wrap items-center gap-2">
                <Skeleton className="h-10 w-[260px] rounded-[12px]" />
                <Skeleton className="ml-auto h-10 w-64 rounded-xl" />
            </div>

            <ReceiptsTableSkeleton hideBommel={false} />
        </div>
    );
}
