import { DocumentDirection, DocumentResponse } from '@hopps/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import i18n from 'i18next';

import { toast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';
import { getErrorStatus, getUserFriendlyErrorMessage } from '@/utils/errorUtils';

/**
 * Shows a toast for a failed document/receipt upload. A 409 means the identical file was already uploaded before, so we
 * surface that precisely instead of the generic conflict message. Defining onError also suppresses the global mutation
 * error toast (see QueryProvider), preventing a duplicate toast.
 */
export function showUploadError(error: unknown) {
    toast({
        title: getErrorStatus(error) === 409 ? i18n.t('receipts.upload.duplicate') : getUserFriendlyErrorMessage(error),
        variant: 'error',
    });
}

export const documentKeys = {
    all: ['documents'] as const,
    lists: () => [...documentKeys.all, 'list'] as const,
    list: (bommelId?: number) => [...documentKeys.lists(), { bommelId }] as const,
    details: () => [...documentKeys.all, 'detail'] as const,
    detail: (id: number) => [...documentKeys.details(), id] as const,
};

export function useDocuments(bommelId?: number) {
    return useQuery({
        queryKey: documentKeys.list(bommelId),
        queryFn: () => apiService.orgService.documentsAll(bommelId),
        // While any document is still being analysed, poll so freshly uploaded receipts progress from
        // analyzing → ready live, even if the document-change WebSocket is unavailable. Stops once nothing analyses.
        refetchInterval: (query) => {
            const data = query.state.data as DocumentResponse[] | undefined;
            if (!data) return false;
            const analysing = data.some((d) => d.analysisStatus === 'PENDING' || d.analysisStatus === 'ANALYZING');
            return analysing ? 3000 : false;
        },
    });
}

/**
 * Fetches a single document. While its analysis is still running (PENDING/ANALYZING) the query polls every 2s so the
 * AI-extracted data appears live in the UI; polling stops automatically once the analysis reaches a terminal state.
 */
export function useDocument(id: number | undefined, options?: { poll?: boolean }) {
    const poll = options?.poll ?? true;
    return useQuery({
        queryKey: documentKeys.detail(id ?? 0),
        queryFn: () => apiService.orgService.documentsGET(id!),
        enabled: !!id,
        refetchInterval: (query) => {
            if (!poll) return false;
            const data = query.state.data as DocumentResponse | undefined;
            if (!data) return false;
            const analyzing = data.analysisStatus === 'PENDING' || data.analysisStatus === 'ANALYZING';
            return analyzing ? 2000 : false;
        },
    });
}

export function useUploadDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file, analyze, direction }: { file: File; analyze: boolean; direction: DocumentDirection }) =>
            apiService.orgService.documentsPOST(analyze, direction, { data: file, fileName: file.name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
        onError: showUploadError,
    });
}

/**
 * Replaces the file of an existing document (keeping its ID and links) and re-triggers analysis — used to restore a
 * receipt whose file is no longer available in storage.
 */
export function useReuploadDocumentFile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, file }: { id: number; file: File }) => apiService.orgService.filePOST(id, true, { data: file, fileName: file.name }),
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(vars.id) });
        },
    });
}

export function useConfirmDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => apiService.orgService.confirm(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
            // Refetch the single document too, so a drawer kept open picks up the freshly linked transactionId
            // (the receipt then switches into the editable reconcile mode instead of closing).
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) });
            // A transaction was created — refresh the transaction lists/detail so it appears immediately.
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
}

export function useUpdateDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...body }: Parameters<typeof apiService.orgService.documentsPATCH>[1] & { id: number }) =>
            apiService.orgService.documentsPATCH(id, body as Parameters<typeof apiService.orgService.documentsPATCH>[1]),
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(vars.id) });
        },
    });
}

export function useDeleteDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => apiService.orgService.documentsDELETE(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
            // Deleting a document also deletes its transaction, which may unmatch a bank transaction.
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
        },
    });
}

export function useReanalyzeDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => apiService.orgService.reanalyze(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
        },
    });
}

// Re-analyze several documents at once (e.g. all previously failed / not-yet-analyzed receipts). Each request
// is independent — one failure does not abort the rest — and the list is refreshed once at the end. Returns the
// number of documents for which re-analysis was successfully triggered.
export function useReanalyzeDocuments() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (ids: number[]) => {
            const results = await Promise.allSettled(ids.map((id) => apiService.orgService.reanalyze(id)));
            return results.filter((r) => r.status === 'fulfilled').length;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });
}

// Derive a human-readable "review status" from documentStatus + analysisStatus
export function getDocumentReviewStatus(doc: DocumentResponse): 'pending' | 'analyzing' | 'ready' | 'confirmed' | 'failed' {
    if (doc.documentStatus === 'CONFIRMED') return 'confirmed';
    if (doc.analysisStatus === 'FAILED' || doc.documentStatus === 'FAILED') return 'failed';
    if (doc.analysisStatus === 'ANALYZING' || doc.analysisStatus === 'PENDING') return 'analyzing';
    if (doc.analysisStatus === 'COMPLETED' || doc.analysisStatus === 'SKIPPED') return 'ready';
    return 'pending';
}
