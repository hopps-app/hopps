import { useTranslation } from 'react-i18next';

import { CARD } from './layout';

import { Skeleton } from '@/components/Dashboard/SectionState';
import { FONT } from '@/components/Transactions/layout';

// Placeholders in the shape of the NGO details page instead of a spinner, with the same primitive as the other page
// skeletons, so the layout does not jump once the data arrives.

/** Field widths of each section card on the 6-column grid, in the order the page renders them. */
const SECTION_FIELDS: number[][] = [[4, 2, 3, 1, 1, 1, 2, 4], [2, 2, 2, 3], [2, 2, 2], [3]];

const SPAN: Record<number, string> = {
    1: 'col-span-2 md:col-span-1',
    2: 'col-span-2 md:col-span-2',
    3: 'col-span-2 md:col-span-3',
    4: 'col-span-2 md:col-span-4',
    6: 'col-span-2 md:col-span-6',
};

function SectionHeaderSkeleton() {
    return (
        <div className="flex items-center gap-[13px]">
            <Skeleton className="h-9 w-9 rounded-[10px]" />
            <Skeleton className="h-4 w-44" />
        </div>
    );
}

/** Rows of the users list while the members load. */
export function OrganizationUsersSkeleton({ rows = 3 }: { rows?: number }) {
    const { t } = useTranslation();

    return (
        <div role="status" aria-busy="true" aria-live="polite">
            <span className="sr-only">{t('common.loading')}</span>
            {Array.from({ length: rows }).map((_, row) => (
                <div key={row} className="flex items-center gap-3 px-1 py-[11px] border-t border-[#E9E9EE] first:border-t-0 dark:border-[#2E2E36]">
                    <span className="flex flex-[1.5] items-center gap-2.5 min-w-0">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-3.5 w-32" />
                    </span>
                    <Skeleton className="h-3.5 flex-1" />
                    <Skeleton className="h-3.5 flex-[1.4]" />
                    <Skeleton className="h-6 w-[104px] rounded-full" />
                </div>
            ))}
        </div>
    );
}

/**
 * Stands in for the whole page while its route chunk or the organization loads: heading, logo card, the form sections
 * and the users list. Lives outside the view so rendering it does not pull the view's chunk in.
 */
export function OrganizationDetailsSkeleton() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col min-h-full" style={{ fontFamily: FONT }} data-testid="organization-details-skeleton">
            <span className="sr-only" role="status">
                {t('common.loading')}
            </span>

            <div className="-mx-4 sm:-mx-7 mb-[18px] px-4 sm:px-7 pt-1 pb-[18px] border-b border-[#E9E9EE] dark:border-[#2E2E36]">
                <div className="mx-auto w-full max-w-[940px]">
                    <Skeleton className="h-8 w-60" />
                    <Skeleton className="mt-2 h-4 w-96 max-w-full" />
                </div>
            </div>

            <div className="mx-auto w-full max-w-[940px] flex flex-col gap-[18px] pb-8">
                <section className={`${CARD} px-6 py-5 flex items-center gap-[18px]`}>
                    <Skeleton className="h-[58px] w-[58px] rounded-[16px]" />
                    <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3.5 w-56" />
                    </div>
                    <Skeleton className="h-9 w-32 rounded-[var(--btn-radius)]" />
                </section>

                {SECTION_FIELDS.map((fields, section) => (
                    <section key={section} className={`${CARD} px-6 py-[22px] flex flex-col gap-4`}>
                        <SectionHeaderSkeleton />
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-[14px]">
                            {fields.map((span, field) => (
                                <div key={field} className={SPAN[span]}>
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="mt-2 h-10 w-full rounded-[10px]" />
                                </div>
                            ))}
                        </div>
                    </section>
                ))}

                <section className={`${CARD} px-6 py-[22px] flex flex-col gap-4`}>
                    <SectionHeaderSkeleton />
                    <OrganizationUsersSkeleton />
                </section>
            </div>
        </div>
    );
}
