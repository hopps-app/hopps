// services/auth/keycloak-client.ts

import axios from 'axios';

interface KeycloakConfig {
    url: string;
    realm: string;
    clientId: string;
    clientSecret?: string; // Optional, only needed for confidential clients
}

interface LoginCredentials {
    username: string;
    password: string;
}

interface AuthTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
}

export class KeycloakService {
    private config: KeycloakConfig;
    private tokenEndpoint: string;

    constructor(config: KeycloakConfig) {
        this.config = config;
        this.tokenEndpoint = `${config.url}/realms/${config.realm}/protocol/openid-connect/token`;
    }

    /**
     * Login with username and password using the password grant
     */
    async login(credentials: LoginCredentials): Promise<AuthTokens> {
        try {
            const formData = new URLSearchParams();
            formData.append('grant_type', 'password');
            formData.append('client_id', this.config.clientId);
            formData.append('username', credentials.username);
            formData.append('password', credentials.password);

            // Add client secret if provided (for confidential clients)
            if (this.config.clientSecret) {
                formData.append('client_secret', this.config.clientSecret);
            }

            const response = await axios.post<AuthTokens>(
                this.tokenEndpoint,
                formData.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(
                    `Keycloak authentication failed: ${
                        error.response?.data?.error_description || error.message
                    }`
                );
            }
            throw error;
        }
    }

    /**
     * Refresh the access token using a refresh token
     */
    async refreshToken(refreshToken: string): Promise<AuthTokens> {
        try {
            const formData = new URLSearchParams();
            formData.append('grant_type', 'refresh_token');
            formData.append('client_id', this.config.clientId);
            formData.append('refresh_token', refreshToken);

            if (this.config.clientSecret) {
                formData.append('client_secret', this.config.clientSecret);
            }

            const response = await axios.post<AuthTokens>(
                this.tokenEndpoint,
                formData.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(
                    `Token refresh failed: ${
                        error.response?.data?.error_description || error.message
                    }`
                );
            }
            throw error;
        }
    }

    /**
     * Logout by invalidating the refresh token
     */
    async logout(refreshToken: string): Promise<void> {
        try {
            const formData = new URLSearchParams();
            formData.append('client_id', this.config.clientId);
            formData.append('refresh_token', refreshToken);

            if (this.config.clientSecret) {
                formData.append('client_secret', this.config.clientSecret);
            }

            await axios.post(
                `${this.config.url}/realms/${this.config.realm}/protocol/openid-connect/logout`,
                formData.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(
                    `Logout failed: ${
                        error.response?.data?.error_description || error.message
                    }`
                );
            }
            throw error;
        }
    }
}