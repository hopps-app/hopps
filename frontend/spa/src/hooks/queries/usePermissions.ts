import { Permission } from '@hopps/api-client';
import { useQuery } from '@tanstack/react-query';

import apiService from '@/services/ApiService';

export const permissionKeys = {
    mine: ['organization', 'permissions'] as const,
};

/**
 * The current user's permissions in their organization. The owner or the board can change someone's role at any time, so this is
 * refetched when the window regains focus and after a minute at most; the server checks every request anyway.
 */
export function usePermissions() {
    return useQuery({
        queryKey: permissionKeys.mine,
        queryFn: () => apiService.orgService.getMyPermissions(),
        staleTime: 60 * 1000,
        refetchOnWindowFocus: true,
    });
}

/** Whether the current user holds the given permission in their organization. False while still loading. */
export function useHasPermission(permission: Permission): boolean {
    const { data: permissions = [] } = usePermissions();
    return permissions.includes(permission);
}

/**
 * Whether the current user may create, change, confirm or delete anything in the bookkeeping. Readers and auditors may
 * only view, so every such button is hidden for them.
 */
export function useCanEditBookkeeping(): boolean {
    return useHasPermission('EDIT_BOOKKEEPING');
}
