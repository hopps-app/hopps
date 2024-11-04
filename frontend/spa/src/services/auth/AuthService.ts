import { KeycloakServiceProvider } from '@/services/auth/keycloakServiceProvider.ts';
import { AuthServiceProvider } from '@/services/auth/AuthServiceProvider.ts';
import { useAuthStore } from '@/store/store.ts';

export class AuthService {
    private provider: AuthServiceProvider;

    constructor(provider: AuthServiceProvider) {
        this.provider = provider;
    }

    async init() {
        return this.provider.init(this);
    }

    login() {
        return this.provider.login();
    }

    async logout() {
        await this.provider.logout();

        this.setAuthTokens(undefined, undefined);
        useAuthStore.getState().setIsAuthenticated(false);
        useAuthStore.getState().setUser(null);
    }

    checkLogin() {
        return this.provider.checkLogin();
    }

    setAuthTokens(token: string | undefined, refreshToken: string | undefined) {
        localStorage.setItem('AUTH_TOKEN', token || '');
        localStorage.setItem('AUTH_TOKEN_REFRESH', refreshToken || '');
    }

    getAuthToken() {
        return localStorage.getItem('AUTH_TOKEN') || undefined;
    }

    getAuthRefreshToken() {
        return localStorage.getItem('AUTH_TOKEN_REFRESH') || undefined;
    }

    setAuthUser(userData: { name: string; email: string } | null) {
        useAuthStore.getState().setIsAuthenticated(!!userData);
        useAuthStore.getState().setUser(
            userData !== null
                ? {
                      name: userData.name,
                      email: userData.email,
                  }
                : null
        );
    }

    isAuthenticated() {
        return useAuthStore.getState().isAuthenticated;
    }

    setIsInitialized(value: boolean) {
        useAuthStore.getState().setIsInitialized(value);
    }
}

const authService = new AuthService(new KeycloakServiceProvider());
export default authService;
