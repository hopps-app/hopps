import { Organization, User } from '@hopps/api-client';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type AuthState = {
    isAuthenticated: boolean;
    isInitialized: boolean;
    user: User | null;
    organization: Organization | null;
    organizationError: boolean;
};

type Actions = {
    setIsAuthenticated: (value: boolean) => void;
    setIsInitialized: (value: boolean) => void;
    setUser: (user: User | null) => void;
    setOrganization: (organisation: Organization | null) => void;
    setOrganizationError: (error: boolean) => void;
};

export const useStore = create<AuthState & Actions>()(
    devtools((set) => ({
        isAuthenticated: false,
        isInitialized: false,
        user: null,
        organization: null,
        organizationError: false,
        setIsAuthenticated: (value: boolean) => set({ isAuthenticated: value }),
        setIsInitialized: (value: boolean) => set({ isInitialized: value }),
        setUser: (user: User | null) => set({ user }),
        setOrganization: (organization: Organization | null) => set({ organization }),
        setOrganizationError: (organizationError: boolean) => set({ organizationError }),
    }))
);
