import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import InvoicesTable from '../InvoicesTable/InvoicesTable';
import SettingsPageHeader from '@/components/SettingsPage/SettingsPageHeader.tsx';
import Button from '@/components/ui/Button.tsx';
import { InvoicesTableData } from '@/components/InvoicesTable/types.ts';
import apiService from '@/services/ApiService.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay.tsx';
import { useStore } from '@/store/store.ts';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

function InvoicesView() {
    const { t } = useTranslation();
    const { showError } = useToast();

    const store = useStore();
    const { loadBommels } = useBommelsStore();

    const [invoices, setInvoices] = useState<InvoicesTableData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const loadInvoices = async () => {
        setInvoices([]);
        try {
            const invoices = await apiService.invoices.getInvoices();
            setInvoices(invoices);
        } catch (e) {
            console.error(e);
            showError(t('invoices.loadFailed'));
            setIsError(true);
        }
    };

    const reload = useCallback(async () => {
        if (!store.organization) return;

        setIsLoading(true);
        setIsError(false);

        try {
            await loadBommels(store.organization.id);
            await loadInvoices();
        } catch (e) {
            console.error(e);
            setIsError(true);
        }

        setIsLoading(false);
    }, [store.organization]);

    useEffect(() => {
        reload();
    }, []);

    return (
        <>
            <LoadingOverlay isEnabled={isLoading} />
            <SettingsPageHeader>
                <Button onClick={reload} disabled={isLoading}>
                    {t('common.refresh')}
                </Button>
            </SettingsPageHeader>
            {isError ? <div>{t('invoices.loadFailed')}</div> : <InvoicesTable invoices={invoices} reload={reload} />}
        </>
    );
}

export default InvoicesView;
