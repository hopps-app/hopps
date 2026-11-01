import { UploadLinkRequest } from '@hopps/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PUBLIC_UPLOAD_PATH } from '@/lib/publicUpload';
import apiService from '@/services/ApiService';

export const uploadLinkKeys = {
    all: ['upload-links'] as const,
    detail: (bommelId: number) => [...uploadLinkKeys.all, bommelId] as const,
};

/** The public upload link of a bommel, or null when it has none. */
export function useBommelUploadLink(bommelId: number | undefined) {
    return useQuery({
        queryKey: uploadLinkKeys.detail(bommelId ?? 0),
        // The endpoint answers 204 without a link, which the client resolves as null.
        queryFn: async () => (await apiService.orgService.getBommelUploadLink(bommelId as number)) ?? null,
        enabled: !!bommelId,
    });
}

/** Creates a new link for the bommel; an existing one is replaced and stops working. */
export function useRegenerateUploadLink(bommelId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (expiresAt: Date | undefined) => apiService.orgService.regenerateBommelUploadLink(bommelId, new UploadLinkRequest({ expiresAt })),
        onSuccess: (link) => queryClient.setQueryData(uploadLinkKeys.detail(bommelId), link),
    });
}

export function useRevokeUploadLink(bommelId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => apiService.orgService.revokeBommelUploadLink(bommelId),
        onSuccess: () => queryClient.setQueryData(uploadLinkKeys.detail(bommelId), null),
    });
}

/** The address a submitter opens; served by this SPA. */
export function uploadLinkUrl(token: string) {
    return `${window.location.origin}${PUBLIC_UPLOAD_PATH}/${token}`;
}
