import type { DocumentType, TransactionStatus } from '@hopps/api-client';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ReceiptRow from '@/components/Receipts/ReceiptRow';
import ReceiptsEmptyState from '@/components/Receipts/ReceiptsEmptyState';
import { ReceiptFiltersState } from '@/components/Receipts/types';
import { transactionToReceipt, useTransactions } from '@/hooks/queries/useTransactions';

type ReceiptsListProps = {
    filters: ReceiptFiltersState;
};

const ReceiptsList: FC<ReceiptsListProps> = ({ filters }) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [checked, setChecked] = useState<Record<string, boolean>>({});

    // Map UI filters to API filters
    const apiFilters = useMemo(() => {
        // Determine document type filter based on income/expense checkboxes
        let documentType: DocumentType | undefined;
        if (filters.type.income && !filters.type.expense) {
            documentType = 'RECEIPT'; // Income = RECEIPT
        } else if (filters.type.expense && !filters.type.income) {
            documentType = 'INVOICE'; // Expense = INVOICE
        }
        // If both or neither are checked, don't filter by document type

        // Determine status filter
        let status: TransactionStatus | undefined;
        if (filters.status.draft) {
            status = 'DRAFT';
        }

        // Determine privatelyPaid filter (unpaid)
        const privatelyPaid = filters.status.unpaid ? true : undefined;

        return {
            search: filters.search || undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
            bommelId: filters.project ? parseInt(filters.project, 10) : undefined,
            categoryId: filters.category ? parseInt(filters.category, 10) : undefined,
            documentType,
            status,
            privatelyPaid,
        };
    }, [filters]);

    const { data: transactions, isLoading, isError } = useTransactions(apiFilters);

    const toggleRow = (id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCheckChange = (id: string, value: boolean) => {
        setChecked((prev) => ({ ...prev, [id]: value }));
    };

    // Convert transactions to receipts format
    const receipts = useMemo(() => {
        if (!transactions) return [];
        return transactions.map(transactionToReceipt);
    }, [transactions]);

    // Track previous displayAll value to detect changes
    const prevDisplayAllRef = useRef(filters.displayAll);

    // Expand/collapse all when displayAll filter changes
    useEffect(() => {
        const prevDisplayAll = prevDisplayAllRef.current;
        prevDisplayAllRef.current = filters.displayAll;

        // Only react to actual changes in displayAll
        if (prevDisplayAll === filters.displayAll) return;
        if (!receipts.length) return;

        if (filters.displayAll) {
            // Expand all receipts
            const allExpanded = receipts.reduce(
                (acc, receipt) => {
                    acc[receipt.id] = true;
                    return acc;
                },
                {} as Record<string, boolean>
            );
            setExpanded(allExpanded);
        } else {
            // Collapse all receipts
            setExpanded({});
        }
    }, [filters.displayAll, receipts]);

    if (isLoading) {
        return <div className="text-center text-[var(--grey-700)] py-6">{t('common.loading')}</div>;
    }

    if (isError) {
        return <div className="text-center text-red-500 py-6">{t('invoices.loadFailed')}</div>;
    }

    if (receipts.length === 0) {
        return <ReceiptsEmptyState />;
    }

    return (
        <ul className="space-y-2">
            {receipts.map((receipt) => (
                <ReceiptRow
                    key={receipt.id}
                    receipt={receipt}
                    isExpanded={Boolean(expanded[receipt.id])}
                    isChecked={Boolean(checked[receipt.id])}
                    onToggle={toggleRow}
                    onCheckChange={handleCheckChange}
                />
            ))}
        </ul>
    );
};

export default ReceiptsList;
