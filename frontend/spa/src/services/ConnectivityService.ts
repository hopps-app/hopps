import { oidcProviderUrl } from '@/services/auth/auth.config.ts';
import { useStore } from '@/store/store';

const TIMEOUT_MS = 5000;

function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

async function checkIdentityProvider(): Promise<boolean> {
    try {
        // The discovery document of the provider the SPA logs in with (see auth.config.ts).
        const url = `${oidcProviderUrl?.replace(/\/+$/, '')}/.well-known/openid-configuration`;

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
    const [identityProviderOk, backendOk] = await Promise.all([checkIdentityProvider(), checkBackend()]);

    useStore.getState().setIdentityProviderReachable(identityProviderOk);
    useStore.getState().setBackendReachable(backendOk);
}

const connectivityService = { checkIdentityProvider, checkBackend, checkAll };
export default connectivityService;
