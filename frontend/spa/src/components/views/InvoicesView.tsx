import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import InvoicesTable from '../InvoicesTable/InvoicesTable';
import SettingsPageHeader from '@/components/SettingsPage/SettingsPageHeader.tsx';
import Button from '@/components/ui/Button.tsx';
import { InvoicesTableData } from '@/components/InvoicesTable/types.ts';
import apiService from '@/services/ApiService.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay.tsx';

function InvoicesView() {
    const { showError } = useToast();
    const { t } = useTranslation();
    const [invoices, setInvoices] = useState<InvoicesTableData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadInvoices = useCallback(async () => {
        setIsLoading(true);
        setInvoices([]);

        try {
            const invoices = await apiService.invoices.getInvoices();

            setInvoices(invoices);
        } catch (e) {
            console.error('Failed to load invoices:', e);
            showError({ title: 'Failed to load invoices' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    function onClickRefresh() {
        loadInvoices();
    }

    useEffect(() => {
        loadInvoices();
    }, [loadInvoices]);

    return (
        <>
            <LoadingOverlay isEnabled={isLoading} />
            <SettingsPageHeader>
                <Button onClick={onClickRefresh} disabled={isLoading}>
                    {t('common.refresh')}
                </Button>
            </SettingsPageHeader>
            <InvoicesTable invoices={invoices} />
        </>
    );
}

export default InvoicesView;
