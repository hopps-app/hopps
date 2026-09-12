import { Organization, User } from '@hopps/api-client';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { InstanceInfo } from '@/services/instance/instanceService';

type AuthState = {
    isAuthenticated: boolean;
    isInitialized: boolean;
    user: User | null;
    organization: Organization | null;
    organizationError: boolean;
    /** Installation facts (tenancy mode, pending setup); null until loaded, see useInstance() for the fallback. */
    instance: InstanceInfo | null;
    keycloakReachable: boolean | null;
    backendReachable: boolean | null;
};

type Actions = {
    setIsAuthenticated: (value: boolean) => void;
    setIsInitialized: (value: boolean) => void;
    setUser: (user: User | null) => void;
    setOrganization: (organisation: Organization | null) => void;
    setOrganizationError: (error: boolean) => void;
    setInstance: (instance: InstanceInfo | null) => void;
    setKeycloakReachable: (value: boolean | null) => void;
    setBackendReachable: (value: boolean | null) => void;
};

export const useStore = create<AuthState & Actions>()(
    devtools((set) => ({
        isAuthenticated: false,
        isInitialized: false,
        user: null,
        organization: null,
        organizationError: false,
        instance: null,
        keycloakReachable: null,
        backendReachable: null,
        setIsAuthenticated: (value: boolean) => set({ isAuthenticated: value }),
        setIsInitialized: (value: boolean) => set({ isInitialized: value }),
        setUser: (user: User | null) => set({ user }),
        setOrganization: (organization: Organization | null) => set({ organization }),
        setOrganizationError: (organizationError: boolean) => set({ organizationError }),
        setInstance: (instance: InstanceInfo | null) => set({ instance }),
        setKeycloakReachable: (value: boolean | null) => set({ keycloakReachable: value }),
        setBackendReachable: (value: boolean | null) => set({ backendReachable: value }),
    }))
);
