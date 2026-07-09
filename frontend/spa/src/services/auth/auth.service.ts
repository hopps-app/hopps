import { User } from '@hopps/api-client';
import Keycloak from 'keycloak-js';

import { useStore } from '@/store/store';

// give keycloak some margin to refresh
const TOKEN_REFRESH_MARGIN_SECONDS = 60;

export class AuthService {
    private keycloak: Keycloak;

    constructor() {
        this.keycloak = new Keycloak({
            url: import.meta.env.VITE_KEYCLOAK_URL,
            realm: import.meta.env.VITE_KEYCLOAK_REALM,
            clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
        });

        this.keycloak.onAuthSuccess = () => this.updateAuthState(true);
        this.keycloak.onAuthLogout = () => this.updateAuthState(false);
        this.keycloak.onTokenExpired = () => {
            this.refreshToken();
        };
    }

    private updateAuthState(authenticated: boolean) {
        useStore.getState().setIsAuthenticated(authenticated);

        if (authenticated) {
            this.loadUserInfo();
        } else {
            useStore.getState().setUser(null);
        }
    }

    async loadUserInfo() {
        try {
            const userData = await this.keycloak.loadUserInfo();
            useStore.getState().setUser(userData as User);
        } catch (e) {
            console.error('Failed to load user info', e);
        }
    }

    async init() {
        let isSuccessInit = false;
        try {
            isSuccessInit = await this.keycloak.init({
                enableLogging: true,
                onLoad: 'check-sso',
                checkLoginIframe: false, // needs to be false, otherwise the iframe triggers onAuthLogout after 5 seconds
            });

            useStore.getState().setIsAuthenticated(this.isAuthenticated());

            if (isSuccessInit && this.isAuthenticated()) {
                await this.loadUserInfo();
            }
        } catch (error) {
            console.error('Failed to initialize adapter:', error);
            useStore.getState().setIsAuthenticated(false);
        }

        return isSuccessInit;
    }

    async login(redirectUri?: string) {
        return await this.keycloak.login(redirectUri ? { redirectUri } : undefined);
    }

    async logout() {
        return await this.keycloak.logout({
            redirectUri: window.location.origin,
        });
    }

    isAuthenticated(): boolean {
        return this.keycloak.authenticated === true && !this.keycloak.isTokenExpired();
    }

    /**
     * Refreshes the access token if it is close to expiry. A rejection here means
     * Keycloak refused the refresh token, i.e. the SSO session itself has ended —
     * so drop auth state and let AuthGuard decide where the user goes.
     */
    async refreshToken(): Promise<boolean> {
        try {
            return await this.keycloak.updateToken(TOKEN_REFRESH_MARGIN_SECONDS);
        } catch (e) {
            console.error('Token refresh rejected, session has ended:', e);
            this.updateAuthState(false);
            return false;
        }
    }

    getAuthToken() {
        return this.keycloak.token;
    }
}

const authService = new AuthService();
export default authService;
