import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/Dashboard/SectionState';

/** A label above a field, both as tall as the real ones (14px label, h-10 input). */
function FieldSkeleton({ labelWidth }: { labelWidth: string }) {
    return (
        <div className="grid gap-1.5">
            <Skeleton className={`h-3.5 ${labelWidth}`} />
            <Skeleton className="h-10 w-full rounded-xl" />
        </div>
    );
}

/**
 * Stands in for the registration page while its route chunk loads, in place of a centred spinner: the same card with
 * heading, step bar and the fields of the first step, so the form fills in where the placeholders already are. Lives
 * outside the view so rendering it does not pull the view's chunk in.
 */
export function RegistrationSkeleton() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center pt-1" aria-busy="true" data-testid="registration-skeleton">
            <span className="sr-only" role="status">
                {t('common.loading')}
            </span>
            <div className="w-full sm:w-[500px] bg-background-secondary rounded-2xl shadow-2xl p-6 mb-4">
                <div className="mb-4">
                    <Skeleton className="h-7 w-56" />
                    <Skeleton className="mt-2 h-4 w-72 max-w-full" />
                    <div className="mt-4 flex gap-1.5">
                        <Skeleton className="h-[3px] flex-1 rounded-full" />
                        <Skeleton className="h-[3px] flex-1 rounded-full" />
                    </div>
                    <div className="mt-1.5 flex">
                        <div className="flex-1">
                            <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="flex-1">
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <FieldSkeleton labelWidth="w-36" />
                    <FieldSkeleton labelWidth="w-52" />
                    <FieldSkeleton labelWidth="w-16" />
                    <FieldSkeleton labelWidth="w-24" />
                </div>

                <Skeleton className="mt-6 h-10 w-full rounded-xl" />
                <Skeleton className="mx-auto mt-4 h-5 w-64 max-w-full" />
            </div>
        </div>
    );
}
