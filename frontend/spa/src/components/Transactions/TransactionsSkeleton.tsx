import { useTranslation } from 'react-i18next';

import { FONT, TX_GRID, TX_GRID_GAP, TX_GRID_NARROW } from './layout';

import { Skeleton } from '@/components/Dashboard/SectionState';

// Placeholders in the shape of the real thing, not a spinner: the table, the detail drawer and the
// whole page keep their layout while the data arrives, so nothing jumps once it does. Same primitive
// as the dashboard skeleton.

/** Table placeholder. Reads the same column template as the header and the rows, so the columns line up. */
export function TableSkeleton({ hideBommel }: { hideBommel: boolean }) {
    const { t } = useTranslation();
    const columns = { gridTemplateColumns: hideBommel ? TX_GRID_NARROW : TX_GRID, columnGap: TX_GRID_GAP, fontFamily: FONT };

    return (
        <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            data-testid="transactions-skeleton"
            className="rounded-[var(--r-card)] border border-border-soft overflow-hidden"
            style={{ background: 'var(--background-secondary)', boxShadow: 'var(--shadow-md)' }}
        >
            <span className="sr-only">{t('common.loading')}</span>

            <div className="grid items-center border-b border-border-soft" style={{ ...columns, padding: '12px 20px' }}>
                <Skeleton className="h-5 w-5 rounded-md" />
                {Array.from({ length: hideBommel ? 5 : 6 }).map((_, i) => (
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
                    <Skeleton className="h-3.5 w-20" />
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

/** Detail drawer placeholder: hero, detail rows, one section block. */
export function DrawerSkeleton() {
    const { t } = useTranslation();

    return (
        <div className="flex-1 overflow-y-auto" role="status" aria-busy="true" aria-live="polite" data-testid="transaction-drawer-skeleton">
            <span className="sr-only">{t('common.loading')}</span>

            <div className="p-6">
                <div className="flex items-center gap-3.5">
                    <Skeleton className="h-[52px] w-[52px] rounded-[15px]" />
                    <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-3.5 w-32" />
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="mt-[18px] h-10 w-44" />

                <div className="mt-[22px] space-y-3 rounded-[var(--r-card)] border border-border-soft px-[18px] py-4">
                    {[0, 1, 2].map((row) => (
                        <div key={row} className="flex items-center justify-between gap-4">
                            <Skeleton className="h-3.5 w-24" />
                            <Skeleton className="h-3.5 w-28" />
                        </div>
                    ))}
                </div>

                <div className="mt-6 space-y-3">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-[68px] w-full rounded-[var(--r-card)]" />
                </div>
            </div>
        </div>
    );
}

/**
 * Stands in for the whole page while its route chunk loads: heading, filter bar, table. Lives outside
 * the view so rendering it does not pull the view's chunk in.
 */
export function TransactionsSkeleton() {
    return (
        <div className="flex flex-col h-full min-h-0" style={{ fontFamily: FONT }} data-testid="transactions-page-skeleton">
            <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                    <Skeleton className="h-7 w-56" />
                    <Skeleton className="mt-2 h-3.5 w-80" />
                </div>
                <Skeleton className="h-[42px] w-40 rounded-full" />
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2.5">
                <Skeleton className="h-11 min-w-[220px] flex-1 rounded-xl" />
                <Skeleton className="h-11 w-[300px] rounded-[12px]" />
                <Skeleton className="h-11 w-28 rounded-[10px]" />
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
                <TableSkeleton hideBommel={false} />
            </div>
        </div>
    );
}
