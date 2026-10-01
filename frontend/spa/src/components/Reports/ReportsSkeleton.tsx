import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/Dashboard/SectionState';

// Placeholders in the shape of the reports page instead of a spinner, with the same primitive as the other skeletons,
// so nothing jumps once the data arrives.

const card = 'rounded-[var(--r-card)] border border-[var(--border-soft)] bg-[var(--background-secondary)]';

/** Result card placeholder: header with the totals above their columns, then a few rows with bars. */
export function ReportResultSkeleton() {
    const { t } = useTranslation();
    return (
        <div role="status" aria-busy="true" aria-live="polite" className={`${card} overflow-hidden`}>
            <span className="sr-only">{t('common.loading')}</span>
            <div className="flex items-center border-b border-[var(--border-soft)] px-4 py-4">
                <div className="flex w-[55%] flex-col gap-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex w-[15%] flex-col items-end gap-1.5 px-2.5">
                        <Skeleton className="h-3 w-14" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                ))}
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center border-t border-[var(--border-soft)] px-4 py-[13px] first:border-t-0">
                    <div className="w-[24%]">
                        <Skeleton className="h-3.5 w-3/4" />
                    </div>
                    <div className="flex w-[20%] flex-col gap-1 px-2.5">
                        <Skeleton className="h-[7px] w-4/5 rounded-full" />
                        <Skeleton className="h-[7px] w-1/2 rounded-full" />
                    </div>
                    <div className="flex flex-1 justify-end gap-6">
                        <Skeleton className="h-3.5 w-8" />
                        <Skeleton className="h-3.5 w-16" />
                        <Skeleton className="h-3.5 w-16" />
                        <Skeleton className="h-3.5 w-16" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Whole-page placeholder: title, filter card and the result. */
export function ReportsSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            <Skeleton className="mb-1 h-8 w-36" />
            <div className={`${card} flex flex-col gap-[18px] px-[22px] py-5`}>
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-[7px]">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
                <div className="grid items-end gap-4 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
                    <div className="flex flex-col gap-[7px]">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-10 w-36 justify-self-end rounded-[var(--btn-radius)]" />
                </div>
            </div>
            <ReportResultSkeleton />
        </div>
    );
}
