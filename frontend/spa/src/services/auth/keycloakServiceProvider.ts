import Keycloak from 'keycloak-js';

import { AuthServiceProvider } from '@/services/auth/AuthServiceProvider.ts';

export class KeycloakServiceProvider implements AuthServiceProvider {
    private keycloak: Keycloak;

    constructor() {
        this.keycloak = new Keycloak({
            url: import.meta.env.VITE_KEYCLOAK_URL,
            realm: import.meta.env.VITE_KEYCLOAK_REALM,
            clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
        });
    }

    async init() {
        console.log('init');
        let isSuccessInit = false;
        try {
            isSuccessInit = await this.keycloak.init({
                enableLogging: true,
                onLoad: 'check-sso',
                silentCheckSsoRedirectUri: `${location.origin}/silent-check-sso.html`,
            });
            console.log(isSuccessInit);
        } catch (error) {
            console.error('Failed to initialize adapter:', error);
        }

        if (isSuccessInit) {
            try {
                const data = (await this.keycloak.loadUserInfo()) as { id: string; name: string; email: string };
            } catch (e) {
                console.error('Failed to load user info', e);
            }
        }
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
