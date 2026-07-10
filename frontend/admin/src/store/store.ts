import { User } from '@hopps/api-client';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type AuthState = {
    isAuthenticated: boolean;
    isInitialized: boolean;
    /** True only when the authenticated user carries the admin realm role. */
    isAdmin: boolean;
    user: User | null;
    keycloakReachable: boolean | null;
};

type Actions = {
    setIsAuthenticated: (value: boolean) => void;
    setIsInitialized: (value: boolean) => void;
    setIsAdmin: (value: boolean) => void;
    setUser: (user: User | null) => void;
    setKeycloakReachable: (value: boolean | null) => void;
};

export const useStore = create<AuthState & Actions>()(
    devtools((set) => ({
        isAuthenticated: false,
        isInitialized: false,
        isAdmin: false,
        user: null,
        keycloakReachable: null,
        setIsAuthenticated: (value: boolean) => set({ isAuthenticated: value }),
        setIsInitialized: (value: boolean) => set({ isInitialized: value }),
        setIsAdmin: (value: boolean) => set({ isAdmin: value }),
        setUser: (user: User | null) => set({ user }),
        setKeycloakReachable: (value: boolean | null) => set({ keycloakReachable: value }),
    }))
);
