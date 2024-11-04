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

        try {
            const isSuccessInit = await this.keycloak?.init({
                enableLogging: true,
                onLoad: 'check-sso',
                token: authService.getAuthToken(),
                refreshToken: authService.getAuthRefreshToken(),
                checkLoginIframe: true,
            });

            if (isSuccessInit) {
                this.authService.setAuthTokens(this.keycloak.token, this.keycloak.refreshToken);

                const data = (await this.keycloak.loadUserInfo()) as {
                    name: string;
                    email: string;
                };
                this.authService.setAuthUser(data);
            }
        } catch (error) {
            console.error('Failed to initialize adapter:', error);
        }
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
}
