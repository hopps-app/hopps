import { User } from '@hopps/api-client';
import Keycloak from 'keycloak-js';

import { useStore } from '@/store/store';

// give keycloak some margin to refresh
const TOKEN_REFRESH_MARGIN_SECONDS = 60;

/** Realm role that gates the admin app. Exists in quarkus-realm.json alongside `Owner` and `user`. */
export const ADMIN_REALM_ROLE = import.meta.env.VITE_ADMIN_REALM_ROLE ?? 'admin';

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
        // A refreshed token can carry a different role set — re-evaluate rather than
        // trusting the flag captured at login, so a revoked admin loses access.
        this.keycloak.onAuthRefreshSuccess = () => {
            useStore.getState().setIsAdmin(this.hasRealmRole(ADMIN_REALM_ROLE));
        };
    }

    private updateAuthState(authenticated: boolean) {
        useStore.getState().setIsAuthenticated(authenticated);
        useStore.getState().setIsAdmin(authenticated && this.hasRealmRole(ADMIN_REALM_ROLE));

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

            useStore.getState().setKeycloakReachable(true);
            useStore.getState().setIsAuthenticated(this.isAuthenticated());
            useStore.getState().setIsAdmin(this.isAuthenticated() && this.hasRealmRole(ADMIN_REALM_ROLE));

            if (isSuccessInit && this.isAuthenticated()) {
                await this.loadUserInfo();
            }
        } catch (error) {
            console.error('Failed to initialize adapter:', error);
            useStore.getState().setKeycloakReachable(false);
            useStore.getState().setIsAuthenticated(false);
            useStore.getState().setIsAdmin(false);
        } finally {
            useStore.getState().setIsInitialized(true);
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

    /** Reads realm_access.roles off the parsed access token. */
    hasRealmRole(role: string): boolean {
        return this.keycloak.hasRealmRole(role);
    }

    /**
     * Refreshes the access token if it is close to expiry. A rejection here means
     * Keycloak refused the refresh token, i.e. the SSO session itself has ended —
     * so drop auth state and let AdminGuard decide where the user goes.
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
