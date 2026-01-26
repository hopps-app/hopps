import { TransactionResponse } from '@hopps/api-client';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import InvoicesTable from '@/components/InvoicesTable/InvoicesTable';
import { InvoicesTableData } from '@/components/InvoicesTable/types.ts';
import Button from '@/components/ui/Button.tsx';
import Header from '@/components/ui/Header';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import apiService from '@/services/ApiService.ts';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store.ts';

async function getInvoices(): Promise<InvoicesTableData[]> {
    const transactions: TransactionResponse[] = [];
    const pageSize = 100;

    let page = 0;

    while (true) {
        const data = await apiService.orgService.transactionsAll(
            undefined, // bommelId
            undefined, // categoryId
            undefined, // detached
            undefined, // documentType
            undefined, // endDate
            page, // page
            undefined, // privatelyPaid
            undefined, // search
            pageSize, // size
            undefined, // startDate
            undefined // status
        );

        if (Array.isArray(data)) {
            transactions.push(...data);
            if (data.length < pageSize) {
                break;
            }
        } else {
            break;
        }

        page++;
    }

    return transactions.map((transaction) => ({
        id: transaction.id,
        amount: transaction.total,
        bommel: transaction.bommelId,
        name: transaction.name,
        date: transaction.transactionTime ? new Date(transaction.transactionTime).toLocaleString() : '',
    }));
}

function InvoicesView() {
    const { t } = useTranslation();
    const { showError } = useToast();

    const store = useStore();
    const { loadBommels } = useBommelsStore();

    const [invoices, setInvoices] = useState<InvoicesTableData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const loadInvoices = useCallback(async () => {
        setInvoices([]);
        try {
            const invoices = await getInvoices();
            setInvoices(invoices);
        } catch (e) {
            console.error(e);
            showError(t('invoices.loadFailed'));
            setIsError(true);
        }
    }, [showError, t]);

    const reload = useCallback(async () => {
        if (!store.organization?.id) return;

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
    }, [store.organization, loadBommels, loadInvoices]);

    useEffect(() => {
        reload();
    }, [reload]);

    return (
        <>
            <LoadingOverlay isEnabled={isLoading} />
            <Header
                title={t('settings.menu.invoices')}
                icon="Archive"
                actions={
                    <Button onClick={reload} disabled={isLoading}>
                        {t('common.refresh')}
                    </Button>
                }
            />
            {isError ? <div>{t('invoices.loadFailed')}</div> : <InvoicesTable invoices={invoices} reload={reload} />}
        </>
    );
}

export default InvoicesView;
