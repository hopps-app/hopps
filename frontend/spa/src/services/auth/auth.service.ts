import Keycloak from 'keycloak-js';
import { User } from '@hopps/api-client/dist/types/User.ts';

import { useStore } from '@/store/store';

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

    async login() {
        return await this.keycloak.login();
    }

    async logout() {
        await this.keycloak.logout({ redirectUri: 'https://hopps.cloud/' });
    }

    async checkLogin() {
        this.keycloak.updateToken(5).catch(() => {
            console.error('Failed to refresh token or user is not authenticated');
        });
    }

    isAuthenticated(): boolean {
        return this.keycloak.authenticated === true && !this.keycloak.isTokenExpired();
    }

    async refreshToken() {
        try {
            await this.keycloak.updateToken(5);
        } catch (e) {
            console.error('Failed to refresh token:', e);
        }
    }

    getAuthToken() {
        return this.keycloak.token;
    }
}

const authService = new AuthService();
export default authService;
