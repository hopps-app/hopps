import { Client } from '@hopps/api-client';

import authService from '@/services/auth/auth.service';

/**
 * Authenticated fetch for the generated api-client: attaches the current Keycloak
 * bearer token, and on a 401 tries one token refresh + retry before giving up.
 * The api-client ships an AuthenticatedHttpClient, but it isn't exported from the
 * package's index, so admin carries its own tiny equivalent here.
 */
const authenticatedHttp = {
    async fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
        const withAuth = (i: RequestInit): RequestInit => {
            const token = authService.getAccessToken();
            return { ...i, headers: { ...i.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
        };

        let response = await fetch(url, withAuth(init ?? {}));

        if (response.status === 401) {
            const refreshed = await authService.refreshToken().catch(() => false);
            if (refreshed) {
                response = await fetch(url, withAuth(init ?? {}));
            }
        }
        return response;
    },
};

/** Single shared api-client instance pointed at the org service. */
export const apiClient = new Client(import.meta.env.VITE_API_ORG_URL, authenticatedHttp);
