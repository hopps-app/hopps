import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/Dashboard/SectionState';

// Placeholders in the shape of the Konten page instead of a spinner, with the same primitive as the transactions and
// dashboard skeletons, so the layout does not jump once the data arrives.

/** Table placeholder for one Konten tab (Abgleich, an account, Importe): a card with a header and a few rows. */
export function KontenTableSkeleton({ rows = 6 }: { rows?: number }) {
    const { t } = useTranslation();

    return (
        <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
            <span className="sr-only">{t('common.loading')}</span>
            <div className="flex items-center gap-6 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="ml-auto h-3 w-16" />
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-gray-100 px-4 py-3.5 last:border-b-0 dark:border-gray-700">
                    <Skeleton className="h-3.5 w-16" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                    </span>
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>
            ))}
        </div>
    );
}

/** Whole-page placeholder: header, account pills, tab bar and the table. */
export function KontenSkeleton() {
    return (
        <div className="flex w-full flex-col gap-6">
            <div className="flex flex-col gap-2">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex flex-wrap gap-2">
                <Skeleton className="h-9 w-40 rounded-full" />
                <Skeleton className="h-9 w-36 rounded-full" />
            </div>
            <Skeleton className="h-9 w-72 rounded-xl" />
            <KontenTableSkeleton />
        </div>
    );
}
