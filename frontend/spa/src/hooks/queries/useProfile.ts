import { MemberProfileInput, MyProfileResponse } from '@hopps/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { permissionKeys } from './usePermissions';

import apiService from '@/services/ApiService';

export const profileKeys = {
    mine: ['member', 'me'] as const,
};

/** The current user's profile: their details, organization, role and permissions. */
export function useMyProfile() {
    return useQuery({
        queryKey: profileKeys.mine,
        queryFn: () => apiService.orgService.getMyProfile(),
    });
}

/** Saves name and phone number of the current user; refreshes the profile and the member list. */
export function useUpdateMyProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (values: { firstName: string; lastName: string; phoneNumber: string }) => {
            const input = new MemberProfileInput();
            input.firstName = values.firstName;
            input.lastName = values.lastName;
            input.phoneNumber = values.phoneNumber;
            return apiService.orgService.updateMyProfile(input);
        },
        onSuccess: (profile: MyProfileResponse) => {
            queryClient.setQueryData(profileKeys.mine, profile);
            queryClient.invalidateQueries({ queryKey: ['organization'] });
            queryClient.invalidateQueries({ queryKey: permissionKeys.mine });
        },
    });
}
