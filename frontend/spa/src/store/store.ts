import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type User = {
    name: string;
    email: string;
};
type Organisation = {
    name: string;
    slug: string;
};

type AuthState = {
    isAuthenticated: boolean;
    isInitialized: boolean;
    user: User | null;
    organisation: Organisation | null;
};

type Actions = {
    setIsAuthenticated: (value: boolean) => void;
    setIsInitialized: (value: boolean) => void;
    setUser: (user: User | null) => void;
    setOrganisation: (organisation: Organisation | null) => void;
};

export const useAuthStore = create<AuthState & Actions>()(
    devtools((set) => ({
        isAuthenticated: false,
        isInitialized: false,
        user: null,
        organisation: null,
        setIsAuthenticated: (value: boolean) => set({ isAuthenticated: value }),
        setIsInitialized: (value: boolean) => set({ isInitialized: value }),
        setUser: (user: User | null) => set({ user }),
        setOrganisation: (organisation: Organisation | null) => set({ organisation }),
    }))
);
