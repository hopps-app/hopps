import { WhatsAppInviteRequest } from '@hopps/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import apiService from '@/services/ApiService';

export const whatsAppInviteKeys = {
    all: ['whatsapp-invites'] as const,
    detail: (bommelId: number) => [...whatsAppInviteKeys.all, bommelId] as const,
    contacts: (bommelId: number) => [...whatsAppInviteKeys.all, bommelId, 'contacts'] as const,
};

/** The WhatsApp invite of a bommel, or null when it has none. */
export function useBommelWhatsAppInvite(bommelId: number | undefined) {
    return useQuery({
        queryKey: whatsAppInviteKeys.detail(bommelId ?? 0),
        // The endpoint answers 204 without an invite, which the client resolves as null.
        queryFn: async () => (await apiService.orgService.getBommelWhatsAppInvite(bommelId as number)) ?? null,
        enabled: !!bommelId,
    });
}

/** Phone numbers connected to the bommel through its invite, newest first. */
export function useBommelWhatsAppContacts(bommelId: number | undefined, enabled = true) {
    return useQuery({
        queryKey: whatsAppInviteKeys.contacts(bommelId ?? 0),
        queryFn: () => apiService.orgService.getBommelWhatsAppContacts(bommelId as number),
        enabled: !!bommelId && enabled,
    });
}

/** Creates a new invite; an existing code stops working, connected numbers stay. */
export function useRegenerateWhatsAppInvite(bommelId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (expiresAt: Date | undefined) => apiService.orgService.regenerateBommelWhatsAppInvite(bommelId, new WhatsAppInviteRequest({ expiresAt })),
        onSuccess: (invite) => queryClient.setQueryData(whatsAppInviteKeys.detail(bommelId), invite),
    });
}

/** Turns WhatsApp off for the bommel: deletes the invite and disconnects all numbers. */
export function useRevokeWhatsAppInvite(bommelId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => apiService.orgService.revokeBommelWhatsAppInvite(bommelId),
        onSuccess: () => {
            queryClient.setQueryData(whatsAppInviteKeys.detail(bommelId), null);
            queryClient.setQueryData(whatsAppInviteKeys.contacts(bommelId), []);
        },
    });
}

export function useRemoveWhatsAppContact(bommelId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (contactId: number) => apiService.orgService.removeBommelWhatsAppContact(bommelId, contactId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: whatsAppInviteKeys.contacts(bommelId) }),
    });
}
