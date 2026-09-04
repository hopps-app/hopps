import { useTranslation } from 'react-i18next';

import { FONT, TX_GRID, TX_GRID_NARROW } from './layout';

import { Skeleton } from '@/components/Dashboard/SectionState';

// Placeholders in the shape of the real thing, not a spinner: the table, the detail drawer and the
// whole page keep their layout while the data arrives, so nothing jumps once it does. Same primitive
// as the dashboard skeleton.

/** Table placeholder. Reads the same column template as the header and the rows, so the columns line up. */
export function TableSkeleton({ hideBommel }: { hideBommel: boolean }) {
    const { t } = useTranslation();
    const columns = { gridTemplateColumns: hideBommel ? TX_GRID_NARROW : TX_GRID, fontFamily: FONT };

    return (
        <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            data-testid="transactions-skeleton"
            className="rounded-[18px] border border-border-soft overflow-hidden"
            style={{ background: 'var(--background-secondary)', boxShadow: '0 1px 2px rgba(20,20,40,.05), 0 6px 22px rgba(20,20,40,.05)' }}
        >
            <span className="sr-only">{t('common.loading')}</span>

            <div className="grid items-center border-b border-border-soft" style={{ ...columns, padding: '11px 20px' }}>
                <Skeleton className="h-5 w-5 rounded-md" />
                {Array.from({ length: hideBommel ? 5 : 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-3 w-20" />
                ))}
                <Skeleton className="h-3 w-16 justify-self-end" />
            </div>

            {Array.from({ length: 8 }).map((_, row) => (
                <div key={row} className="grid items-center border-b border-border-soft last:border-b-0" style={{ ...columns, padding: '14px 20px' }}>
                    <Skeleton className="h-5 w-5 rounded-md" />
                    <span className="flex items-center gap-3 min-w-0 pr-4">
                        <Skeleton className="h-9 w-9 rounded-[10px]" />
                        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <Skeleton className="h-3.5 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </span>
                    </span>
                    {!hideBommel && <Skeleton className="h-3.5 w-24" />}
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-3 w-16" />
                    <span className="flex flex-col items-start gap-1.5">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-3 w-14" />
                    </span>
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

            <div className="px-6 pt-7 pb-6 flex flex-col items-center border-b border-border-soft">
                <Skeleton className="h-[52px] w-[52px] rounded-[10px]" />
                <Skeleton className="mt-4 h-5 w-48" />
                <Skeleton className="mt-2 h-3.5 w-32" />
                <Skeleton className="mt-4 h-9 w-40" />
                <Skeleton className="mt-3 h-6 w-24 rounded-full" />
            </div>

            <div className="px-6 py-5 border-b border-border-soft space-y-3">
                {[0, 1, 2].map((row) => (
                    <div key={row} className="flex items-center justify-between gap-4">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3.5 w-28" />
                    </div>
                ))}
            </div>

            <div className="px-6 py-5 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-[68px] w-full rounded-[10px]" />
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
                <Skeleton className="h-[42px] min-w-[220px] flex-1 rounded-xl" />
                <Skeleton className="h-[42px] w-[300px] rounded-[12px]" />
                <Skeleton className="h-[38px] w-28 rounded-[9px]" />
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
                <TableSkeleton hideBommel={false} />
            </div>
        </div>
    );
}
