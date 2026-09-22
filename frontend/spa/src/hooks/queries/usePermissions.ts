import { Permission } from '@hopps/api-client';
import { useQuery } from '@tanstack/react-query';

import apiService from '@/services/ApiService';

export const permissionKeys = {
    mine: ['organization', 'permissions'] as const,
};

/** The current user's permissions in their organization. */
export function usePermissions() {
    return useQuery({
        queryKey: permissionKeys.mine,
        queryFn: () => apiService.orgService.getMyPermissions(),
    });
}

/** Whether the current user holds the given permission in their organization. */
export function useHasPermission(permission: Permission): boolean {
    const { data: permissions = [] } = usePermissions();
    return permissions.includes(permission);
}
