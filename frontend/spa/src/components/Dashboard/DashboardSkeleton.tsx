import { Skeleton } from './SectionState';

import { Card } from '@/components/ui/Card';

/**
 * Stands in for the dashboard while its route chunk loads, in place of a centred spinner. It mirrors
 * the real layout — band, three figures, chart card — so the page fills in where the placeholders
 * already are instead of rearranging itself around a spinner.
 */
export function DashboardSkeleton() {
    return (
        <div className="flex h-full w-full min-w-0 flex-col" aria-busy="true" aria-live="polite" data-testid="dashboard-skeleton">
            <Skeleton className="mb-4 h-[92px] w-full rounded-[18px] sm:mb-[18px]" />

            <div className="mb-4 flex min-w-0 flex-col gap-4 sm:mb-[18px] sm:flex-row">
                {[0, 1, 2].map((index) => (
                    <Card key={index} className="min-w-0 flex-1 gap-0 rounded-[20px] border-border-soft bg-background-secondary px-[22px] py-5 shadow-card">
                        <div className="flex items-center justify-between gap-3">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-[30px] w-[30px] rounded-[9px]" />
                        </div>
                        <Skeleton className="mt-3 h-9 w-32" />
                        <Skeleton className="mt-3 h-4 w-40" />
                    </Card>
                ))}
            </div>

            <Card className="flex min-h-0 flex-1 flex-col gap-0 rounded-[20px] border-border-soft bg-background-secondary px-4 py-5 shadow-card sm:px-6 sm:py-[22px]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <Skeleton className="h-5 w-52" />
                        <Skeleton className="mt-2 h-4 w-72" />
                    </div>
                    <div className="flex w-full flex-wrap items-end gap-2.5 sm:ml-auto sm:w-auto">
                        <Skeleton className="h-10 w-full rounded-[13px] sm:w-[200px]" />
                        <Skeleton className="h-10 w-full rounded-[13px] sm:w-[176px]" />
                    </div>
                </div>
                <div className="mt-3.5 flex flex-wrap gap-5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-40" />
                </div>
                <Skeleton className="mt-3 min-h-[200px] w-full flex-1 rounded-xl" />
            </Card>
        </div>
    );
}
