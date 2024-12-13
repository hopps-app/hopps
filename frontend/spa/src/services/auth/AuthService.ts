import { KeycloakServiceProvider } from '@/services/auth/keycloakServiceProvider.ts';
import { AuthServiceProvider } from '@/services/auth/AuthServiceProvider.ts';
import { useAuthStore } from '@/store/store.ts';
import apiService from '@/services/ApiService.ts';

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

    async loadUserOrganisation() {
        const user = useAuthStore.getState().user;

        if (!user) {
            useAuthStore.getState().setOrganisation(null);
            return;
        }

        // todo replace with out using slug
        const organisationSlug = 'test';
        const organisation = await apiService.organization.getBySlug(organisationSlug);

        useAuthStore.getState().setOrganisation(organisation);
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

    async setAuthUser(userData: { name: string; email: string } | null) {
        useAuthStore.getState().setUser(
            userData !== null
                ? {
                      name: userData.name,
                      email: userData.email,
                  }
                : null
        );
        await this.loadUserOrganisation();
        useAuthStore.getState().setIsAuthenticated(!!userData);
    }

    isAuthenticated() {
        return useAuthStore.getState().isAuthenticated;
    }

    setIsInitialized(value: boolean) {
        useAuthStore.getState().setIsInitialized(value);
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
