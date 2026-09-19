import { oidcProviderUrl } from '@/services/auth/auth.config.ts';
import { useStore } from '@/store/store';

const TIMEOUT_MS = 5000;

function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

async function checkKeycloak(): Promise<boolean> {
    try {
        // The discovery document of whichever provider the SPA logs in with (see auth.config.ts).
        const issuer = oidcProviderUrl
            ? oidcProviderUrl.replace(/\/+$/, '')
            : `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}`;
        const url = `${issuer}/.well-known/openid-configuration`;

        const response = await fetchWithTimeout(url);
        return response.ok;
    } catch {
        return false;
    }
}

async function checkBackend(): Promise<boolean> {
    try {
        const apiUrl = import.meta.env.VITE_API_ORG_URL;
        const url = `${apiUrl}/health`;

        const response = await fetchWithTimeout(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

async function checkAll(): Promise<void> {
    const [keycloakOk, backendOk] = await Promise.all([checkKeycloak(), checkBackend()]);

    useStore.getState().setKeycloakReachable(keycloakOk);
    useStore.getState().setBackendReachable(backendOk);
}

const connectivityService = { checkKeycloak, checkBackend, checkAll };
export default connectivityService;
