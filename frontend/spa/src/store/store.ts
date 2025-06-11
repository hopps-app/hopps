import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Organization, User } from '@hopps/api-client';

type AuthState = {
    isAuthenticated: boolean;
    isInitialized: boolean;
    user: User | null;
    organization: Organization | null;
};

type Actions = {
    setIsAuthenticated: (value: boolean) => void;
    setIsInitialized: (value: boolean) => void;
    setUser: (user: User | null) => void;
    setOrganization: (organisation: Organization | null) => void;
};

export const useStore = create<AuthState & Actions>()(
    devtools((set) => ({
        isAuthenticated: false,
        isInitialized: false,
        user: null,
        organization: null,
        setIsAuthenticated: (value: boolean) => set({ isAuthenticated: value }),
        setIsInitialized: (value: boolean) => set({ isInitialized: value }),
        setUser: (user: User | null) => set({ user }),
        setOrganization: (organization: Organization | null) => set({ organization }),
    }))
);
