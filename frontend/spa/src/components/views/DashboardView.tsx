import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { flattenBommelTree } from '@/components/Dashboard/bommelTree';
import { useOpenReceiptsCount } from '@/components/Dashboard/hooks';
import { IncomeExpenseCard } from '@/components/Dashboard/IncomeExpenseCard';
import { KpiSection } from '@/components/Dashboard/KpiSection';
import { OpenReceiptsBanner } from '@/components/Dashboard/OpenReceiptsBanner';
import { usePageTitle } from '@/hooks/use-page-title';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

/**
 * The landing page after login. It answers three questions without a click: where do we stand, how
 * did we develop, and what is waiting for me. Every section loads and fails on its own, so one broken
 * request never takes the whole page down.
 */
function DashboardView() {
    const { t } = useTranslation();
    usePageTitle(t('dashboard.title'));

    const { organization } = useStore();
    const { allBommels, rootBommel, isLoading: isBommelsLoading, loadBommels } = useBommelsStore();

    useEffect(() => {
        if (organization?.id && allBommels.length === 0) {
            loadBommels(organization.id);
        }
    }, [organization?.id, allBommels.length, loadBommels]);

    const bommelItems = useMemo(() => flattenBommelTree(allBommels, rootBommel?.id), [allBommels, rootBommel?.id]);

    const openReceipts = useOpenReceiptsCount(organization?.id);

    return (
        <div className="flex h-full w-full min-w-0 flex-col">
            <h1 className="sr-only">{t('dashboard.title')}</h1>

            {/* Failing to count open receipts is not worth a banner of its own — the section simply
                stays away rather than shouting at a treasurer who cannot act on it. */}
            <OpenReceiptsBanner count={openReceipts.error ? 0 : openReceipts.data} isLoading={openReceipts.isPending} />

            <KpiSection organizationId={organization?.id} />

            <IncomeExpenseCard organizationId={organization?.id} bommels={allBommels} bommelItems={bommelItems} isBommelsLoading={isBommelsLoading} />
        </div>
    );
}

export default DashboardView;
