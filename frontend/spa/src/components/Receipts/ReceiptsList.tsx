import type { TransactionStatus } from '@hopps/api-client';
import { RefreshCw } from 'lucide-react';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LoadingState } from '@/components/common/LoadingState/LoadingState';
import { DeleteTransactionDialog } from '@/components/Receipts/DeleteTransactionDialog';
import { formatAmount } from '@/components/Receipts/helpers/receiptHelpers';
import ReceiptRow from '@/components/Receipts/ReceiptRow';
import ReceiptsEmptyState from '@/components/Receipts/ReceiptsEmptyState';
import { Receipt, ReceiptFiltersState } from '@/components/Receipts/types';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { useToast } from '@/hooks/use-toast';
import { TransactionFilters, transactionToReceipt, useDeleteTransaction, useTransactions } from '@/hooks/queries/useTransactions';
import { getUserFriendlyErrorMessage } from '@/utils/errorUtils';

type ReceiptsListProps = {
    filters: ReceiptFiltersState;
};

const ReceiptsList: FC<ReceiptsListProps> = ({ filters }) => {
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const [page, setPage] = useState(0);
    const pageSize = 10;
    const [deleteTarget, setDeleteTarget] = useState<Receipt | null>(null);
    const deleteTransaction = useDeleteTransaction();

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
            area: (filters.area as TransactionFilters['area']) || undefined,
            status,
            privatelyPaid,
            page,
            size: pageSize,
        };
    }, [filters, page]);

    const { data: transactions, isLoading, isError, error, refetch, isFetching } = useTransactions(apiFilters);

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
    }, [filters.search, filters.startDate, filters.endDate, filters.project, filters.category, filters.area, filters.status]);

    const handleDeleteRequest = useCallback(
        (id: string) => {
            const receipt = receipts.find((r) => r.id === id);
            if (receipt) {
                setDeleteTarget(receipt);
            }
        },
        [receipts]
    );

    const deletingRef = useRef(false);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteTarget) return;
        if (deletingRef.current) return;
        deletingRef.current = true;
        try {
            await deleteTransaction.mutateAsync(parseInt(deleteTarget.id, 10));
            setDeleteTarget(null);
            showSuccess(t('receipts.deleteDialog.success'));
        } catch (e) {
            console.error(e);
            showError(t('receipts.deleteDialog.error'));
        } finally {
            deletingRef.current = false;
        }
    }, [deleteTarget, deleteTransaction, showError, showSuccess, t]);

    const handleDeleteCancel = useCallback(() => {
        setDeleteTarget(null);
    }, []);

    if (isLoading) {
        return (
            <div className="py-12">
                <LoadingState size="lg" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="rounded-full bg-destructive/10 p-3">
                    <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <p className="text-destructive font-medium" data-testid="receipts-error-message">
                    {getUserFriendlyErrorMessage(error)}
                </p>
                <BaseButton
                    variant="outline"
                    size="sm"
                    data-testid="receipts-retry-button"
                    disabled={isFetching}
                    onClick={() => refetch()}
                    className="gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    {isFetching ? t('errors.network.retrying') : t('errors.api.retry')}
                </BaseButton>
            </div>
        );
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
                        onDelete={handleDeleteRequest}
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

            {/* Delete Confirmation Dialog */}
            <DeleteTransactionDialog
                open={!!deleteTarget}
                transactionName={deleteTarget?.issuer || ''}
                transactionAmount={deleteTarget ? formatAmount(deleteTarget.amount) : ''}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
            />
        </div>
    );
};

export default ReceiptsList;
