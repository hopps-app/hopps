import { DocumentDirection, DocumentResponse } from '@hopps/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import apiService from '@/services/ApiService';

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
    });
}

export function useConfirmDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => apiService.orgService.confirm(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
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

// Derive a human-readable "review status" from documentStatus + analysisStatus
export function getDocumentReviewStatus(doc: DocumentResponse): 'pending' | 'analyzing' | 'ready' | 'confirmed' | 'failed' {
    if (doc.documentStatus === 'CONFIRMED') return 'confirmed';
    if (doc.analysisStatus === 'FAILED' || doc.documentStatus === 'FAILED') return 'failed';
    if (doc.analysisStatus === 'ANALYZING' || doc.analysisStatus === 'PENDING') return 'analyzing';
    if (doc.analysisStatus === 'COMPLETED' || doc.analysisStatus === 'SKIPPED') return 'ready';
    return 'pending';
}
