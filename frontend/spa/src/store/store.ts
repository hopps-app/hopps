import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type User = {
    name: string;
    email: string;
};

type AuthState = {
    isAuthenticated: boolean;
    isInitialized: boolean;
    user: User | null;
};

type Actions = {
    setIsAuthenticated: (value: boolean) => void;
    setIsInitialized: (value: boolean) => void;
    setUser: (user: User | null) => void;
};

export const useAuthStore = create<AuthState & Actions>()(
    devtools((set) => ({
        isAuthenticated: false,
        isInitialized: false,
        user: null,
        setIsAuthenticated: (value: boolean) => set({ isAuthenticated: value }),
        setIsInitialized: (value: boolean) => set({ isInitialized: value }),
        setUser: (user: User | null) => set({ user }),
    }))
);
