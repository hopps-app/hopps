import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bommel } from '@hopps/api-client';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';
import organizationTreeService from '@/services/OrganisationTreeService';

export const bommelKeys = {
    all: ['bommels'] as const,
    lists: () => [...bommelKeys.all, 'list'] as const,
    listByOrg: (orgId: number) => [...bommelKeys.lists(), { orgId }] as const,
    listByRoot: (rootId: number) => [...bommelKeys.lists(), { rootId }] as const,
    details: () => [...bommelKeys.all, 'detail'] as const,
    detail: (id: number) => [...bommelKeys.details(), id] as const,
    root: (orgId: number) => [...bommelKeys.all, 'root', orgId] as const,
};

export function useRootBommel(organizationId: number | undefined) {
    return useQuery({
        queryKey: bommelKeys.root(organizationId ?? 0),
        queryFn: () => organizationTreeService.ensureRootBommelCreated(organizationId!),
        enabled: !!organizationId,
    });
}

export function useBommels(rootBommelId: number | undefined) {
    return useQuery({
        queryKey: bommelKeys.listByRoot(rootBommelId ?? 0),
        queryFn: () => organizationTreeService.getOrganizationBommels(rootBommelId!),
        enabled: !!rootBommelId,
    });
}

export function useBommelsByOrganization(organizationId: number | undefined) {
    const rootQuery = useRootBommel(organizationId);

    return useQuery({
        queryKey: bommelKeys.listByOrg(organizationId ?? 0),
        queryFn: async () => {
            if (!rootQuery.data?.id) throw new Error('Root bommel not found');
            return organizationTreeService.getOrganizationBommels(rootQuery.data.id);
        },
        enabled: !!organizationId && !!rootQuery.data?.id,
    });
}

export function useCreateBommel() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (data: { name: string; emoji?: string; parentId: number }) => apiService.orgService.bommelPOST(new Bommel(data)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bommelKeys.lists() });
            showSuccess(t('organization.structure.saveName'));
        },
        onError: () => {
            showError(t('organization.settings.saveError'));
        },
    });
}

export function useUpdateBommel() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: { name?: string; emoji?: string; parentId?: number } }) => apiService.orgService.bommelPUT(id, new Bommel(data)),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: bommelKeys.lists() });
            queryClient.invalidateQueries({ queryKey: bommelKeys.detail(variables.id) });
            showSuccess(t('organization.structure.saveName'));
        },
        onError: () => {
            showError(t('organization.settings.saveError'));
        },
    });
}

export function useDeleteBommel() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (id: number) => apiService.orgService.bommelDELETE(id, undefined),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bommelKeys.lists() });
            showSuccess(t('organization.structure.deleteBommel'));
        },
        onError: () => {
            showError(t('organization.settings.saveError'));
        },
    });
}
