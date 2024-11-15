import { KeycloakServiceProvider } from '@/services/auth/keycloakServiceProvider.ts';
import { AuthServiceProvider } from '@/services/auth/AuthServiceProvider.ts';
import { useAuthStore } from '@/store/store.ts';

export class AuthService {
    private provider: AuthServiceProvider;
    private refreshTokenInterval: number = 0;

    constructor(provider: AuthServiceProvider) {
        this.provider = provider;
    }

    async init() {
        await this.provider.init(this);
        console.log('INIT', this.isAuthenticated());

        if (this.isAuthenticated()) {
            this.startTokenRefresh();
        }
    }

    login() {
        return this.provider.login();
    }

    async logout() {
        await this.provider.logout();
        this.stopTokenRefresh();

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

    async refreshToken() {
        console.log('REFRESH AUTH TOKEN');
        const refreshToken = this.getAuthRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        this.provider.refreshToken(refreshToken);
    }

    private startTokenRefresh() {
        console.log('STARTED REFRESH INTERVAL');
        this.stopTokenRefresh();

        this.refreshTokenInterval = window.setInterval(() => {
            this.refreshToken().catch((e) => console.error(e));
        }, 30000);
    }

    private stopTokenRefresh() {
        window.clearInterval(this.refreshTokenInterval);
        this.refreshTokenInterval = 0;
    }
}

const authService = new AuthService(new KeycloakServiceProvider());
export default authService;
