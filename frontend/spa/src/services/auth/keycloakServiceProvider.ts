import Keycloak from 'keycloak-js';

import { AuthServiceProvider } from '@/services/auth/AuthServiceProvider.ts';
import { AuthService } from '@/services/auth/AuthService.ts';

export class KeycloakServiceProvider implements AuthServiceProvider {
    private keycloak: Keycloak | null = null;
    private authService: AuthService | null = null;

    async init(authService: AuthService) {
        this.authService = authService;
        this.keycloak = new Keycloak({
            url: import.meta.env.VITE_KEYCLOAK_URL,
            realm: import.meta.env.VITE_KEYCLOAK_REALM,
            clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
        });

        let isSuccessInit = false;
        try {
            isSuccessInit = await this.keycloak?.init({
                enableLogging: true,
                onLoad: 'check-sso',
                token: authService.getAuthToken(),
                refreshToken: authService.getAuthRefreshToken(),
                checkLoginIframe: true,
            });
        } catch (error) {
            console.error('Failed to initialize adapter:', error);
        }

        if (isSuccessInit) {
            this.authService.setAuthTokens(this.keycloak.token, this.keycloak.refreshToken);

            try {
                const data = (await this.keycloak.loadUserInfo()) as {
                    name: string;
                    email: string;
                };
                this.authService.setAuthUser(data);
            } catch (e) {
                this.authService.setAuthUser(null);
                console.error('Failed to load user info', e);
            }
        }

        this.authService.setIsInitialized(true);
    }

    async login() {
        return this.keycloak?.login();
    }

    async logout() {
        await this.keycloak?.logout();
    }

    async checkLogin() {
        this.keycloak
            ?.updateToken(5)
            .then((isUpdated) => {
                if (isUpdated) {
                    console.log('Token was successfully refreshed');
                } else {
                    console.log('Token is still valid');
                }
            })
            .catch(() => {
                console.error('Failed to refresh token or user is not authenticated');
            });
    }

    isAuthenticated(): boolean {
        return this.keycloak?.isTokenExpired() || false;
    }

    async refreshToken() {
        if (!this.keycloak) {
            throw new Error('No refresh token available');
        }
        try {
            console.log(this.keycloak.refreshTokenParsed);
            const expiresIn = (this.keycloak.refreshTokenParsed?.['exp'] || 0) - Math.ceil(new Date().getTime() / 1000);

            console.log('TOKEN EXPITES IN ', expiresIn);
            const refreshed = await this.keycloak.updateToken(5);
            if (refreshed) {
                this.authService!.setAuthTokens(this.keycloak.token, this.keycloak.refreshToken);
                console.log('Token was successfully refreshed');
            } else {
                console.log('Token is still valid');
            }
        } catch (e) {
            console.error(e);
            throw new Error('Failed to refresh the token, or the session has expired');
        }
    }
}
