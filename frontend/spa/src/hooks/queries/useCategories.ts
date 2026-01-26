import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoryInput } from '@hopps/api-client';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';

export const categoryKeys = {
    all: ['categories'] as const,
    lists: () => [...categoryKeys.all, 'list'] as const,
    list: (filters: string) => [...categoryKeys.lists(), { filters }] as const,
    details: () => [...categoryKeys.all, 'detail'] as const,
    detail: (id: number) => [...categoryKeys.details(), id] as const,
};

export function useCategories() {
    return useQuery({
        queryKey: categoryKeys.lists(),
        queryFn: () => apiService.orgService.categoryAll(),
    });
}

export function useCategory(id: number) {
    return useQuery({
        queryKey: categoryKeys.detail(id),
        queryFn: () => apiService.orgService.categoryGET(id),
        enabled: !!id,
    });
}

export function useCreateCategory() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (data: { name: string; description?: string | null }) => apiService.orgService.categoryPOST(new CategoryInput({ name: data.name, description: data.description ?? undefined })),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
            showSuccess(t('categories.form.success.categoryCreated'));
        },
        onError: () => {
            showError(t('categories.form.error.categoryCreated'));
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: { name: string; description?: string | null } }) => apiService.orgService.categoryPUT(id, new CategoryInput({ name: data.name, description: data.description ?? undefined })),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
            queryClient.invalidateQueries({ queryKey: categoryKeys.detail(variables.id) });
            showSuccess(t('categories.form.success.categoryCreated'));
        },
        onError: () => {
            showError(t('categories.form.error.categoryCreated'));
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (id: number) => apiService.orgService.categoryDELETE(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
            showSuccess(t('categories.form.success.categoryCreated'));
        },
        onError: () => {
            showError(t('categories.form.error.categoryCreated'));
        },
    });
}
