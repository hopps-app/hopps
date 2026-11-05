import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/Dashboard/SectionState';
import { cn } from '@/lib/utils';

// Placeholder in the shape of the Bommel page instead of a spinner, with the same primitive as the other page skeletons,
// so the layout does not jump once the data arrives. Kept free of the page's own components: the router imports it
// eagerly as the lazy route's fallback.

const LINE = 'bg-[var(--border-soft)]';

/** One Bommel card: emoji and name, then the three amounts */
function CardSkeleton({ root, className }: { root?: boolean; className?: string }) {
    return (
        <div
            className={cn(
                'rounded-2xl border px-[15px] py-[13px] shadow-[var(--shadow-md)]',
                root ? 'border-[var(--accent-surface-strong)] bg-[var(--accent-surface)]' : 'border-border-soft bg-background-secondary',
                className
            )}
        >
            <div className="flex items-center gap-2.5">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className={cn('h-3.5', root ? 'w-32' : 'w-24')} />
            </div>
            <div className="mt-[11px] flex items-end gap-2 border-t border-border-soft pt-2.5">
                <Skeleton className="h-6 flex-1" />
                <Skeleton className="h-6 flex-1" />
                <Skeleton className="h-8 w-14 rounded-[10px]" />
            </div>
        </div>
    );
}

/** Whole-page placeholder: title, switch bar and the tree canvas with a root and three Bommel below it */
export function BommelSkeleton() {
    const { t } = useTranslation();

    return (
        <div role="status" aria-busy="true" aria-live="polite" className="flex h-full flex-col">
            <span className="sr-only">{t('common.loading')}</span>

            <Skeleton className="mb-4 h-8 w-36" />

            <div className="mb-4 flex flex-wrap items-center gap-x-[30px] gap-y-3 rounded-[18px] border border-border-soft bg-background-secondary px-[18px] py-3 shadow-[var(--shadow-sm)]">
                {['w-36', 'w-32', 'w-32'].map((width, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                        <Skeleton className="h-5 w-9 rounded-full" />
                        <Skeleton className={cn('h-3.5', width)} />
                    </div>
                ))}
                <Skeleton className="ml-auto h-9 w-28 rounded-[10px]" />
            </div>

            <div className="flex min-h-[420px] flex-1 flex-col items-center overflow-hidden rounded-[18px] border border-border-soft bg-[var(--surface-sunken)] px-3 pt-4 shadow-[var(--shadow-sm)] md:px-5 md:pt-[30px]">
                <CardSkeleton root className="w-full md:w-[300px]" />

                {/* Tablet and desktop: three children side by side under a rail */}
                <span aria-hidden="true" className={cn('hidden h-5 w-0.5 md:block', LINE)} />
                <div className="relative hidden items-start md:flex">
                    <span aria-hidden="true" className={cn('absolute left-[129px] right-[129px] top-0 h-0.5', LINE)} />
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex flex-col items-center px-[9px]">
                            <span aria-hidden="true" className={cn('block h-5 w-0.5', LINE)} />
                            <CardSkeleton className="w-[240px]" />
                        </div>
                    ))}
                </div>

                {/* Phones: children stacked and indented, like the vertical tree */}
                <div className="mt-3.5 flex w-full flex-col gap-3.5 pl-8 md:hidden">
                    {[0, 1, 2].map((i) => (
                        <CardSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default BommelSkeleton;
