import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/Dashboard/SectionState';

/**
 * Placeholder for the categories page while groups and templates load, in the shape of the overview (header, hint,
 * group cards) and with the same primitive as the transactions and dashboard skeletons, so nothing jumps afterwards.
 */
export function CategoryGroupsSkeleton() {
    const { t } = useTranslation();

    return (
        <div role="status" aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
            <span className="sr-only">{t('common.loading')}</span>

            <div className="flex items-start justify-between gap-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32 rounded-[var(--btn-radius)]" />
            </div>

            <Skeleton className="h-[46px] w-full rounded-2xl" />

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex flex-col gap-3.5 rounded-[var(--r-card)] border border-[var(--border-soft)] bg-[var(--background-secondary)] px-5 py-[18px]"
                    >
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-[13px]" />
                            <div className="flex flex-1 flex-col gap-2">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-5 w-28 rounded-full" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-3">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-3 w-20" />
                            <div className="flex flex-wrap gap-[7px]">
                                <Skeleton className="h-7 w-24 rounded-[var(--r-sm)]" />
                                <Skeleton className="h-7 w-20 rounded-[var(--r-sm)]" />
                                <Skeleton className="h-7 w-28 rounded-[var(--r-sm)]" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
