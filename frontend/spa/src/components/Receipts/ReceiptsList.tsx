import type { TransactionStatus } from '@hopps/api-client';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LoadingState } from '@/components/common/LoadingState/LoadingState';
import { DeleteTransactionDialog } from '@/components/Receipts/DeleteTransactionDialog';
import { formatAmount } from '@/components/Receipts/helpers/receiptHelpers';
import ReceiptRow from '@/components/Receipts/ReceiptRow';
import ReceiptsEmptyState from '@/components/Receipts/ReceiptsEmptyState';
import ReceiptsTableHeader from '@/components/Receipts/ReceiptsTableHeader';
import { Receipt, ReceiptFiltersState } from '@/components/Receipts/types';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { TransactionFilters, transactionToReceipt, useDeleteTransaction, useTransactions } from '@/hooks/queries/useTransactions';
import { useToast } from '@/hooks/use-toast';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { getUserFriendlyErrorMessage } from '@/utils/errorUtils';

type ReceiptsListProps = {
    filters: ReceiptFiltersState;
};

const ReceiptsList: FC<ReceiptsListProps> = ({ filters }) => {
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [page, setPage] = useState(0);
    const pageSize = 10;
    const [deleteTarget, setDeleteTarget] = useState<Receipt | null>(null);
    const deleteTransaction = useDeleteTransaction();

    // Map UI filters to API filters
    const apiFilters = useMemo(() => {
        let status: TransactionStatus | undefined;
        if (filters.status.draft) {
            status = 'DRAFT';
        }

        const privatelyPaid = filters.status.unpaid ? true : undefined;
        const detached = filters.status.unassigned ? true : undefined;

        return {
            search: filters.search || undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
            bommelId: filters.project ? parseInt(filters.project, 10) : undefined,
            categoryId: filters.category ? parseInt(filters.category, 10) : undefined,
            area: (filters.area as TransactionFilters['area']) || undefined,
            status,
            privatelyPaid,
            detached,
            page,
            size: pageSize,
        };
    }, [filters, page]);

    const { data: transactions, isLoading, isError, error, refetch, isFetching } = useTransactions(apiFilters);
    const allBommels = useBommelsStore((state) => state.allBommels);

    // Build a bommel ID -> emoji lookup map
    const bommelEmojiMap = useMemo(() => {
        const map: Record<number, string> = {};
        for (const bommel of allBommels) {
            if (bommel.id != null && bommel.emoji) {
                map[bommel.id] = bommel.emoji;
            }
        }
        return map;
    }, [allBommels]);

    // Convert transactions to receipts format
    const receipts = useMemo(() => {
        if (!transactions) return [];
        return transactions.map((tx) => transactionToReceipt(tx, bommelEmojiMap));
    }, [transactions, bommelEmojiMap]);

    // Track previous displayAll value to detect changes
    const prevDisplayAllRef = useRef(filters.displayAll);

    // Expand/collapse all when displayAll filter changes
    useEffect(() => {
        const prevDisplayAll = prevDisplayAllRef.current;
        prevDisplayAllRef.current = filters.displayAll;

        if (prevDisplayAll === filters.displayAll) return;
        if (!receipts.length) return;

        if (filters.displayAll) {
            const allExpanded = receipts.reduce(
                (acc, receipt) => {
                    acc[receipt.id] = true;
                    return acc;
                },
                {} as Record<string, boolean>
            );
            setExpanded(allExpanded);
        } else {
            setExpanded({});
        }
    }, [filters.displayAll, receipts]);

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [filters.search, filters.startDate, filters.endDate, filters.project, filters.category, filters.area, filters.status]);

    const toggleExpand = useCallback((id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    }, []);

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
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <p className="text-destructive font-medium" data-testid="receipts-error-message">
                    {getUserFriendlyErrorMessage(error)}
                </p>
                <BaseButton variant="outline" data-testid="receipts-retry-button" disabled={isFetching} onClick={() => refetch()} className="gap-2">
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

    return (
        <div className="space-y-2">
            <ReceiptsTableHeader />

            {/* Rows */}
            <div className="flex flex-col gap-2">
                {receipts.map((receipt) => (
                    <ReceiptRow
                        key={receipt.id}
                        receipt={receipt}
                        isExpanded={Boolean(expanded[receipt.id])}
                        onToggle={toggleExpand}
                        onDelete={handleDeleteRequest}
                    />
                ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--grey-700)]">
                    {t('receipts.pagination.page')} {page + 1}
                </p>
                <div className="flex items-center gap-1">
                    <BaseButton
                        variant="outline"
                        size="icon"
                        onClick={() => setPage((prev) => prev - 1)}
                        disabled={!hasPrevPage}
                        className="h-9 w-9 p-0 rounded-xl border-[#A7A7A7]"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </BaseButton>
                    <div className="flex h-9 min-w-[36px] items-center justify-center rounded-xl bg-[var(--purple-100)] px-3 text-sm font-medium text-[var(--purple-900)]">
                        {page + 1}
                    </div>
                    <BaseButton
                        variant="outline"
                        size="icon"
                        onClick={() => setPage((prev) => prev + 1)}
                        disabled={!hasNextPage}
                        className="h-9 w-9 p-0 rounded-xl border-[#A7A7A7]"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </BaseButton>
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
