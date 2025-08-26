import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TransactionRecord } from '@hopps/api-client';

import InvoicesTable from '@/components/InvoicesTable/InvoicesTable';
import { InvoicesTableData } from '@/components/InvoicesTable/types.ts';
import Button from '@/components/ui/Button.tsx';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import apiService from '@/services/ApiService.ts';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store.ts';
import Header from '@/components/ui/Header';

async function getInvoices(): Promise<InvoicesTableData[]> {
    const transactions: TransactionRecord[] = [];
    const pageSize = 100;

    let page = 0;

    while (true) {
        const data = await apiService.orgService.all(undefined, false, page, pageSize);

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

    const loadInvoices = async () => {
        setInvoices([]);
        try {
            const invoices = await getInvoices();
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
