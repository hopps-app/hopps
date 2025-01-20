import { pick } from 'lodash';

import { KeycloakServiceProvider } from '@/services/auth/keycloakServiceProvider.ts';
import { AuthServiceProvider } from '@/services/auth/AuthServiceProvider.ts';
import { useStore } from '@/store/store.ts';

export class AuthService {
    private provider: AuthServiceProvider;
    private refreshTokenInterval: number = 0;

    constructor(provider: AuthServiceProvider) {
        this.provider = provider;
    }

    async init() {
        await this.provider.init(this);

        if (this.isAuthenticated()) {
            this.startTokenRefresh();
        }
    }

    login() {
        window.localStorage.setItem('REDIRECT_AFTER_LOGIN', 'true');
        return this.provider.login();
    }

    async logout() {
        await this.provider.logout();
        this.stopTokenRefresh();

        this.setAuthTokens(undefined, undefined);
        useStore.getState().setIsAuthenticated(false);
        useStore.getState().setUser(null);
    }

    checkLogin() {
        return this.provider.checkLogin();
    }

    onUserLogin() {
        const isRedirectAfterLogin = window.localStorage.getItem('REDIRECT_AFTER_LOGIN') === 'true';
        window.localStorage.removeItem('REDIRECT_AFTER_LOGIN');

        if (isRedirectAfterLogin) {
            window.setTimeout(() => {
                window.location.href = '/';
            }, 0);
        }
    }

    async loadUserOrganisation() {
        const apiService = (await import('@/services/ApiService.ts')).default;
        const user = useStore.getState().user;

        if (!user) {
            useStore.getState().setOrganization(null);
            return;
        }

        const organisation = await apiService.organization.getCurrentOrganization();

        useStore.getState().setOrganization(organisation);
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

    async setAuthUser(userData: { id: string; name: string; email: string } | null) {
        useStore.getState().setUser(userData !== null ? pick(userData, ['id', 'name', 'email']) : null);
        await this.loadUserOrganisation();
        useStore.getState().setIsAuthenticated(!!userData);
    }

    isAuthenticated() {
        return useStore.getState().isAuthenticated;
    }

    setIsInitialized(value: boolean) {
        useStore.getState().setIsInitialized(value);
    }

    async refreshToken() {
        const refreshToken = this.getAuthRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        this.provider.refreshToken(refreshToken);
    }

    private startTokenRefresh() {
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
