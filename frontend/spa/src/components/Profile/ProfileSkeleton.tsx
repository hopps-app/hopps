import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/Dashboard/SectionState';
import { CARD } from '@/components/Organization/layout';
import { FONT } from '@/components/Transactions/layout';

/**
 * Stands in for the profile page while its route chunk loads: heading, account card, appearance tiles and the
 * language field. Lives outside the view so rendering it does not pull the view's chunk in.
 */
export function ProfileSkeleton() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col min-h-full" style={{ fontFamily: FONT }} data-testid="profile-skeleton">
            <span className="sr-only" role="status">
                {t('common.loading')}
            </span>

            <div className="-mx-4 sm:-mx-7 mb-[18px] px-4 sm:px-7 pt-1 pb-[18px] border-b border-[#E9E9EE] dark:border-[#2E2E36]">
                <div className="mx-auto w-full max-w-[940px]">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="mt-2 h-4 w-72 max-w-full" />
                </div>
            </div>

            <div className="mx-auto w-full max-w-[940px] flex flex-col gap-[18px] pb-8">
                <section className={`${CARD} px-6 py-5 flex items-center gap-[18px]`}>
                    <Skeleton className="h-[58px] w-[58px] rounded-[16px]" />
                    <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3.5 w-56" />
                    </div>
                </section>

                <section className={`${CARD} px-6 py-[22px] flex flex-col gap-4`}>
                    <div className="flex items-center gap-[13px]">
                        <Skeleton className="h-9 w-9 rounded-[10px]" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px]">
                        {[0, 1, 2].map((tile) => (
                            <Skeleton key={tile} className="h-[66px] w-full rounded-[14px]" />
                        ))}
                    </div>
                </section>

                <section className={`${CARD} px-6 py-[22px] flex flex-col gap-4`}>
                    <div className="flex items-center gap-[13px]">
                        <Skeleton className="h-9 w-9 rounded-[10px]" />
                        <Skeleton className="h-4 w-28" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-[14px]">
                        <div className="col-span-2 md:col-span-3">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="mt-2 h-10 w-full rounded-[10px]" />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
