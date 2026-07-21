import { User } from '@hopps/api-client';
import Keycloak from 'keycloak-js';

import { useStore } from '@/store/store';

// give keycloak some margin to refresh
const TOKEN_REFRESH_MARGIN_SECONDS = 60;
// Poll often enough that a short-lived access token is renewed well before it expires. Each successful refresh also
// resets Keycloak's SSO session idle timeout, so an open (even backgrounded) tab stays logged in instead of silently
// crossing the idle window. Browsers throttle background timers, but combined with a short access-token lifespan this
// keeps the session alive comfortably ahead of the idle boundary.
const PROACTIVE_REFRESH_INTERVAL_MS = 60_000;
// A single failed refresh is usually a transient hiccup (network blip, momentary Keycloak unavailability), not an
// ended session — retry a few times before giving up.
const MAX_REFRESH_ATTEMPTS = 3;

export class AuthService {
    private keycloak: Keycloak;
    private refreshInterval: ReturnType<typeof setInterval> | null = null;
    private refreshInFlight: Promise<boolean> | null = null;

    constructor() {
        this.keycloak = new Keycloak({
            url: import.meta.env.VITE_KEYCLOAK_URL,
            realm: import.meta.env.VITE_KEYCLOAK_REALM,
            clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
        });

        this.keycloak.onAuthSuccess = () => this.updateAuthState(true);
        this.keycloak.onAuthLogout = () => this.updateAuthState(false);
        this.keycloak.onTokenExpired = () => {
            void this.refreshToken();
        };
    }

    private updateAuthState(authenticated: boolean) {
        useStore.getState().setIsAuthenticated(authenticated);

        if (authenticated) {
            this.startProactiveRefresh();
            this.loadUserInfo();
        } else {
            this.stopProactiveRefresh();
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
                // A session restored via check-sso is authenticated but does not always fire onAuthSuccess, so make
                // sure the proactive refresh loop is running.
                this.startProactiveRefresh();
                await this.loadUserInfo();
            }
        } catch (error) {
            console.error('Failed to initialize adapter:', error);
            useStore.getState().setIsAuthenticated(false);
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

    /**
     * Refreshes the access token if it is close to expiry. Concurrent callers (the proactive timer racing a 401
     * retry, several parallel requests) share a single in-flight refresh so one expiry never triggers several
     * parallel refreshes — or several parallel logout decisions.
     */
    async refreshToken(): Promise<boolean> {
        if (this.refreshInFlight) {
            return this.refreshInFlight;
        }
        this.refreshInFlight = this.doRefreshWithRetry();
        try {
            return await this.refreshInFlight;
        } finally {
            this.refreshInFlight = null;
        }
    }

    /**
     * Tries to renew the access token, tolerating transient failures. Only a genuinely ended session — the refresh
     * token itself has expired (idle/absolute timeout reached) or Keycloak no longer holds it — drops the auth state
     * and sends the user to login. A network blip or momentary Keycloak outage is retried with a short backoff and,
     * if still failing while the session is technically still valid, leaves the user logged in for the next attempt,
     * so a single hiccup no longer bounces them to the login page.
     */
    private async doRefreshWithRetry(): Promise<boolean> {
        for (let attempt = 1; attempt <= MAX_REFRESH_ATTEMPTS; attempt++) {
            try {
                await this.keycloak.updateToken(TOKEN_REFRESH_MARGIN_SECONDS);
                return true;
            } catch (e) {
                if (this.isRefreshTokenExpired()) {
                    console.error('Refresh token expired — SSO session has ended:', e);
                    this.updateAuthState(false);
                    return false;
                }
                console.warn(`Token refresh failed (attempt ${attempt}/${MAX_REFRESH_ATTEMPTS}), will retry:`, e);
                if (attempt < MAX_REFRESH_ATTEMPTS) {
                    await this.delay(attempt * 1000);
                }
            }
        }
        // Transient failures exhausted but the session is still valid: keep the user signed in and let the proactive
        // timer or the next request retry, rather than logging them out over a temporary glitch.
        console.error('Token refresh failed after retries; keeping session and retrying later.');
        return false;
    }

    /** Whether the refresh token itself has expired — i.e. the SSO session can no longer be renewed. */
    private isRefreshTokenExpired(): boolean {
        const exp = this.keycloak.refreshTokenParsed?.exp;
        if (exp == null) {
            return true;
        }
        const nowWithSkew = Math.floor(Date.now() / 1000) + (this.keycloak.timeSkew ?? 0);
        return exp <= nowWithSkew;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /** Periodically renews the token in the background so an active session never lapses at the idle boundary. */
    private startProactiveRefresh() {
        if (this.refreshInterval != null) {
            return;
        }
        this.refreshInterval = setInterval(() => {
            void this.refreshToken();
        }, PROACTIVE_REFRESH_INTERVAL_MS);
    }

    private stopProactiveRefresh() {
        if (this.refreshInterval != null) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    getAuthToken() {
        return this.keycloak.token;
    }
}

const authService = new AuthService();
export default authService;
