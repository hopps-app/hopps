import type { TransactionArea, TransactionStatus } from '@hopps/api-client';
import { TransactionCreateRequest, TransactionResponse, TransactionUpdateRequest } from '@hopps/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import i18n from '@/i18n';
import apiService from '@/services/ApiService';

export type TransactionSortBy = 'createdAt' | 'updatedAt' | 'transactionTime' | 'total';
export type SortDirection = 'asc' | 'desc';

export interface TransactionFilters {
    search?: string;
    startDate?: string;
    endDate?: string;
    bommelId?: number;
    categoryId?: number;
    status?: TransactionStatus;
    privatelyPaid?: boolean;
    detached?: boolean;
    area?: TransactionArea;
    sortBy?: TransactionSortBy;
    sortDir?: SortDirection;
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
                filters.area,
                filters.bommelId,
                filters.categoryId,
                filters.detached,
                filters.endDate,
                filters.page ?? 0,
                filters.privatelyPaid,
                filters.search,
                filters.size ?? 50,
                filters.sortBy,
                filters.sortDir,
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

export function useCreateTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: TransactionCreateRequest) => apiService.orgService.transactionsPOST(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
        },
    });
}

export function useUpdateTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: TransactionUpdateRequest }) => apiService.orgService.transactionsPATCH(id, data),
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
            queryClient.invalidateQueries({ queryKey: transactionKeys.detail(vars.id) });
        },
    });
}

export function useConfirmTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => apiService.orgService.confirm2(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
            queryClient.invalidateQueries({ queryKey: transactionKeys.detail(id) });
        },
    });
}

export function useDeleteTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => apiService.orgService.transactionsDELETE(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
            // Deleting a transaction may unmatch a bank transaction (status reset on the backend) — refresh those too.
            queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
        },
    });
}

// Helper to convert TransactionResponse to the Receipt format used by the UI
export function transactionToReceipt(
    tx: TransactionResponse,
    bommelEmojiMap?: Record<number, string>
): {
    id: string;
    issuer: string;
    date: string;
    amount: number;
    category: string;
    status: 'draft' | 'saved';
    privatelyPaid: boolean;
    project: string;
    bommelEmoji: string;
    area: string;
    purpose: string;
    dueDate: string;
    tags: string[];
    reference: string;
    documentId: number | null;
} {
    // Determine status based on transaction status
    const status: 'draft' | 'saved' = tx.status === 'DRAFT' ? 'draft' : 'saved';

    // Format date using current i18n locale
    const formatDate = (instant: Date | undefined | null): string => {
        if (!instant) return '';
        const date = new Date(instant);
        const localeMap: Record<string, string> = { de: 'de-DE', en: 'en-US', uk: 'uk-UA' };
        const locale = localeMap[i18n.language] || 'en-US';
        return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const amount = tx.total ? Number(tx.total) : 0;

    const bommelEmoji = (bommelEmojiMap && tx.bommelId ? bommelEmojiMap[tx.bommelId] : '') ?? '';

    return {
        id: String(tx.id),
        issuer: tx.senderName ?? tx.name ?? '',
        date: formatDate(tx.transactionTime),
        amount,
        category: tx.categoryName ?? '',
        status,
        privatelyPaid: tx.privatelyPaid ?? false,
        project: tx.bommelName ?? '',
        bommelEmoji,
        area: tx.area ?? '',
        purpose: tx.name ?? '',
        dueDate: formatDate(tx.dueDate),
        tags: tx.tags ?? [],
        reference: tx.name ?? '',
        documentId: tx.documentId ?? null,
    };
}
