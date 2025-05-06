import Keycloak from 'keycloak-js';

import { useStore } from '@/store/store';
import { User } from '../api/types/User';

export class KeycloakServiceProvider {
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
            useStore.getState().setOrganization(null);
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
                silentCheckSsoRedirectUri: `${location.origin}/silent-check-sso.html`,
            });

            useStore.getState().setIsInitialized(true);
            useStore.getState().setIsAuthenticated(this.keycloak.authenticated || false);

            if (isSuccessInit && this.isAuthenticated()) {
                await this.loadUserInfo();
            }
        } catch (error) {
            console.error('Failed to initialize adapter:', error);
            useStore.getState().setIsInitialized(true);
            useStore.getState().setIsAuthenticated(false);
        }

        return isSuccessInit;
    }

    async login() {
        return await this.keycloak.login();
    }

    async logout() {
        await this.keycloak.logout();
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
        if (!this.keycloak) {
            throw new Error('No refresh token available');
        }
        try {
            const refreshed = await this.keycloak.updateToken(5);
            if (refreshed) {
            }
        } catch (e) {
            console.error(e);
            throw new Error('Failed to refresh the token, or the session has expired');
        }
    }

    getAuthToken() {
        return this.keycloak.token;
    }
}

const authService = new KeycloakServiceProvider();
export default authService;
