import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import InvoicesTable from '../InvoicesTable/InvoicesTable';
import SettingsPageHeader from '@/components/SettingsPage/SettingsPageHeader.tsx';
import Button from '@/components/ui/Button.tsx';
import { InvoicesTableData } from '@/components/InvoicesTable/types.ts';
import apiService from '@/services/ApiService.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay.tsx';
import organizationTreeService from '@/services/OrganizationTreeService.ts';
import { useStore } from '@/store/store.ts';
import { Bommel } from '@/services/api/types/Bommel.ts';

function InvoicesView() {
    const { showError } = useToast();
    const { t } = useTranslation();
    const store = useStore();
    const [invoices, setInvoices] = useState<InvoicesTableData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [bommels, setBommels] = useState<Bommel[]>([]);

    const loadBommels = useCallback(async () => {
        const organization = store.organization;
        if (!organization) {
            throw new Error('Organization not found');
        }

        const rootBommel = await organizationTreeService.ensureRootBommelCreated(organization.id);
        if (!rootBommel) {
            throw new Error('Root bommel not found');
        }

        const bommels = await organizationTreeService.getOrganizationBommels(rootBommel.id!);
        setBommels(bommels);
    }, []);

    const loadInvoices = useCallback(async () => {
        setInvoices([]);

        const invoices = await apiService.invoices.getInvoices();
        setInvoices(invoices);
    }, []);

    const reload = useCallback(async () => {
        setIsLoading(true);
        await loadBommels().catch((e) => console.error(e));

        try {
            await loadInvoices();
        } catch (e) {
            console.error(e);
            showError(t('invoices.loadFailed'));
            setIsError(true);
        }
        setIsLoading(false);
    }, []);

    async function onClickRefresh() {
        reload();
    }

    useEffect(() => {
        reload();
    }, []);

    return (
        <>
            <LoadingOverlay isEnabled={isLoading} />
            <SettingsPageHeader>
                <Button onClick={onClickRefresh} disabled={isLoading}>
                    {t('common.refresh')}
                </Button>
            </SettingsPageHeader>
            {isError ? <div>{t('invoices.loadFailed')}</div> : <InvoicesTable invoices={invoices} bommels={bommels} />}
        </>
    );
}

export default InvoicesView;
