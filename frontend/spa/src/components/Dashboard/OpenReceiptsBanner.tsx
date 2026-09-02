import { ArrowRight, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Skeleton } from './SectionState';

import { BaseButton } from '@/components/ui/shadecn/BaseButton';

/**
 * Only shown when there is something to do — a band announcing "0 open receipts" is noise, so the
 * banner disappears entirely at zero, and while loading, and if the count could not be fetched.
 */
export function OpenReceiptsBanner({ count, isLoading }: { count: number | undefined; isLoading: boolean }) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    if (isLoading) {
        return <Skeleton className="mb-4 h-[92px] w-full rounded-[18px] sm:mb-[18px]" />;
    }

    if (!count) {
        return null;
    }

    return (
        <div
            className="mb-4 flex flex-col gap-4 rounded-[18px] bg-[linear-gradient(100deg,var(--purple-700),var(--purple-500))] px-5 py-5 text-white sm:mb-[18px] sm:flex-row sm:items-center sm:gap-5 sm:px-6"
            data-testid="dashboard-open-receipts-banner"
        >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-white/20">
                <FileText className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-lg font-bold">{t('dashboard.openReceipts.title')}</p>
                <p className="mt-0.5 text-sm text-white/90" data-testid="dashboard-open-receipts-count">
                    {t('dashboard.openReceipts.description', { count })}
                </p>
            </div>
            <BaseButton
                className="gap-2 bg-white text-[var(--purple-700)] hover:bg-white/90"
                onClick={() => navigate('/receipts')}
                data-testid="dashboard-open-receipts-action"
            >
                {t('dashboard.openReceipts.action')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </BaseButton>
        </div>
    );
}
