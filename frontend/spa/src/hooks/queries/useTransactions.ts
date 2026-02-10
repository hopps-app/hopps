import type { TransactionStatus } from '@hopps/api-client';
import { TransactionResponse } from '@hopps/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import apiService from '@/services/ApiService';

export interface TransactionFilters {
    search?: string;
    startDate?: string;
    endDate?: string;
    bommelId?: number;
    categoryId?: number;
    status?: TransactionStatus;
    privatelyPaid?: boolean;
    detached?: boolean;
    page?: number;
    size?: number;
}

export const transactionKeys = {
    all: ['transactions'] as const,
    lists: () => [...transactionKeys.all, 'list'] as const,
    list: (filters: TransactionFilters) => [...transactionKeys.lists(), filters] as const,
    details: () => [...transactionKeys.all, 'detail'] as const,
    detail: (id: number) => [...transactionKeys.details(), id] as const,
};

export function useTransactions(filters: TransactionFilters = {}) {
    return useQuery({
        queryKey: transactionKeys.list(filters),
        queryFn: () =>
            apiService.orgService.transactionsAll(
                filters.bommelId,
                filters.categoryId,
                filters.detached,
                filters.endDate,
                filters.page ?? 0,
                filters.privatelyPaid,
                filters.search,
                filters.size ?? 50,
                filters.startDate,
                filters.status
            ),
    });
}

export function useTransaction(id: number) {
    return useQuery({
        queryKey: transactionKeys.detail(id),
        queryFn: () => apiService.orgService.transactionsGET(id),
        enabled: !!id,
    });
}

export function useDeleteTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => apiService.orgService.transactionsDELETE(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
        },
    });
}

// Helper to convert TransactionResponse to the Receipt format used by the UI
export function transactionToReceipt(tx: TransactionResponse): {
    id: string;
    issuer: string;
    date: string;
    amount: number;
    category: string;
    status: 'paid' | 'unpaid' | 'draft' | 'failed';
    project: string;
    purpose: string;
    dueDate: string;
    tags: string[];
    reference: string;
} {
    // Determine status based on transaction status and privatelyPaid
    let status: 'paid' | 'unpaid' | 'draft' | 'failed' = 'paid';
    if (tx.status === 'DRAFT') {
        status = 'draft';
    } else if (tx.privatelyPaid) {
        status = 'unpaid';
    }

    // Format date
    const formatDate = (instant: Date | undefined | null): string => {
        if (!instant) return '';
        const date = new Date(instant);
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const amount = tx.total ? Number(tx.total) : 0;

    return {
        id: String(tx.id),
        issuer: tx.senderName ?? tx.name ?? '',
        date: formatDate(tx.transactionTime),
        amount,
        category: tx.categoryName ?? '',
        status,
        project: tx.bommelName ?? '',
        purpose: tx.name ?? '',
        dueDate: formatDate(tx.dueDate),
        tags: tx.tags ?? [],
        reference: tx.name ?? '',
    };
}
