import type { TransactionStatus } from '@hopps/api-client';
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
    const [page, setPage] = useState(0);
    const pageSize = 10;

    // Map UI filters to API filters
    const apiFilters = useMemo(() => {
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
            status,
            privatelyPaid,
            page,
            size: pageSize,
        };
    }, [filters, page]);

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

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [filters.search, filters.startDate, filters.endDate, filters.project, filters.category, filters.status]);

    if (isLoading) {
        return <div className="text-center text-[var(--grey-700)] py-6">{t('common.loading')}</div>;
    }

    if (isError) {
        return <div className="text-center text-red-500 py-6">{t('invoices.loadFailed')}</div>;
    }

    if (receipts.length === 0) {
        return <ReceiptsEmptyState />;
    }

    const hasNextPage = receipts.length === pageSize;
    const hasPrevPage = page > 0;

    const handleNextPage = () => {
        if (hasNextPage) {
            setPage((prev) => prev + 1);
        }
    };

    const handlePrevPage = () => {
        if (hasPrevPage) {
            setPage((prev) => prev - 1);
        }
    };

    return (
        <div className="space-y-4">
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

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-[var(--grey-700)]">
                    {t('receipts.pagination.page')} {page + 1}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrevPage}
                        disabled={!hasPrevPage}
                        className="px-4 py-2 bg-white border border-[var(--grey-300)] rounded-md text-sm font-medium text-[var(--grey-700)] hover:bg-[var(--grey-50)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('receipts.pagination.previous')}
                    </button>
                    <button
                        onClick={handleNextPage}
                        disabled={!hasNextPage}
                        className="px-4 py-2 bg-white border border-[var(--grey-300)] rounded-md text-sm font-medium text-[var(--grey-700)] hover:bg-[var(--grey-50)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('receipts.pagination.next')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptsList;
