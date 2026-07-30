import { CategoryGroupCreateRequest, CategoryGroupResponse, CategoryGroupUpdateRequest, CategoryGroupValueCreateRequest } from '@hopps/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import apiService from '@/services/ApiService';

export const categoryGroupKeys = {
    all: ['category-groups'] as const,
    lists: () => [...categoryGroupKeys.all, 'list'] as const,
    values: (groupId: number, query: string) => [...categoryGroupKeys.all, 'values', groupId, query] as const,
};

/** All category groups of the current organization (lightweight — no value lists). */
export function useCategoryGroups() {
    return useQuery({
        queryKey: categoryGroupKeys.lists(),
        queryFn: () => apiService.orgService.categoryGroupsAll(undefined),
    });
}

/**
 * Searchable, paginated values of a single group — the source for the value picker. Kept small (server-side search)
 * so it scales to very large value sets (e.g. a whole SKR04 chart of accounts).
 */
export function useCategoryGroupValues(groupId: number | undefined, query: string, enabled = true) {
    return useQuery({
        queryKey: categoryGroupKeys.values(groupId ?? 0, query),
        queryFn: () => apiService.orgService.valuesGET(groupId as number, 0, query || undefined, 50),
        enabled: enabled && !!groupId,
    });
}

/**
 * Aggregated report for one group: per-value income/expense/count sums over an optional transaction-date range, plus
 * the overall totals. Drives the reports view.
 */
export function useCategoryGroupReport(groupId: number | undefined, startDate: string, endDate: string, bommelIds: number[] = []) {
    return useQuery({
        queryKey: [...categoryGroupKeys.all, 'report', groupId ?? 0, startDate, endDate, bommelIds],
        // api-client orders params alphabetically: report(id, bommelId, endDate, startDate)
        queryFn: () =>
            apiService.orgService.report(groupId as number, bommelIds.length > 0 ? bommelIds : undefined, endDate || undefined, startDate || undefined),
        enabled: !!groupId,
    });
}

/** How many transactions currently carry a value for this group — used to warn before deletion. */
export function useCategoryGroupUsage(groupId: number | undefined) {
    return useQuery({
        queryKey: [...categoryGroupKeys.all, 'usage', groupId ?? 0],
        queryFn: () => apiService.orgService.usage(groupId as number),
        enabled: !!groupId,
    });
}

export function useCreateCategoryGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: CategoryGroupCreateRequest) => apiService.orgService.categoryGroupsPOST(body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: categoryGroupKeys.all });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
}

export function useUpdateCategoryGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: number; body: CategoryGroupUpdateRequest }) => apiService.orgService.categoryGroupsPUT(id, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: categoryGroupKeys.all });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
}

export function useDeleteCategoryGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => apiService.orgService.categoryGroupsDELETE(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: categoryGroupKeys.all });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
}

export function useAddCategoryGroupValues() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, values }: { id: number; values: string[] }) => apiService.orgService.valuesPOST(id, new CategoryGroupValueCreateRequest({ values })),
        onSuccess: (_res: CategoryGroupResponse, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryGroupKeys.all });
            queryClient.invalidateQueries({ queryKey: categoryGroupKeys.values(variables.id, '') });
        },
    });
}

export function useDeleteCategoryGroupValue() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, valueId }: { id: number; valueId: number }) => apiService.orgService.valuesDELETE(id, valueId),
        onSuccess: (_res, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryGroupKeys.all });
            queryClient.invalidateQueries({ queryKey: categoryGroupKeys.values(variables.id, '') });
        },
    });
}
