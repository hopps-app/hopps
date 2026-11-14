import { WhatsAppInvitationRequest } from '@hopps/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import apiService from '@/services/ApiService';

export const whatsAppContactKeys = {
    all: ['whatsapp-contacts'] as const,
    list: (bommelId: number) => [...whatsAppContactKeys.all, bommelId] as const,
};

/** People invited to send receipts for the bommel via WhatsApp, newest invitation first. */
export function useBommelWhatsAppContacts(bommelId: number | undefined) {
    return useQuery({
        queryKey: whatsAppContactKeys.list(bommelId ?? 0),
        queryFn: () => apiService.orgService.getBommelWhatsAppContacts(bommelId as number),
        enabled: !!bommelId,
    });
}

/** Hopps sends a WhatsApp invitation to the number; it is connected once the person accepts. */
export function useInviteWhatsAppContact(bommelId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { name: string; phoneNumber: string }) =>
            apiService.orgService.inviteBommelWhatsAppContact(bommelId, new WhatsAppInvitationRequest(input)),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: whatsAppContactKeys.list(bommelId) }),
    });
}

export function useResendWhatsAppInvitation(bommelId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (contactId: number) => apiService.orgService.resendBommelWhatsAppInvitation(bommelId, contactId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: whatsAppContactKeys.list(bommelId) }),
    });
}

/** Disconnects the number or withdraws its invitation. */
export function useRemoveWhatsAppContact(bommelId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (contactId: number) => apiService.orgService.removeBommelWhatsAppContact(bommelId, contactId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: whatsAppContactKeys.list(bommelId) }),
    });
}
