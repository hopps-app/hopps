import { User } from '@hopps/api-client';
import { ErrorResponse, UserManager, type User as OidcUser } from 'oidc-client-ts';

import { oidcClientId, oidcProviderUrl, oidcScope } from '@/services/auth/auth.config.ts';
import { useStore } from '@/store/store';

// What a prompt=none request answers when the provider has no session it could use without showing a page. It only
// means "not logged in yet", not that anything broke.
const NO_SESSION_ERRORS = new Set(['login_required', 'interaction_required', 'consent_required', 'account_selection_required']);
// Per tab marker that the user logged out. Logging out of hopps does not necessarily end the session at the provider
// (that is up to the provider's invalidation flow), so without it the next page load would log them straight back in.
// Cleared by an explicit login; a new tab (e.g. opened from a partner's portal) still logs in silently.
const LOGGED_OUT_KEY = 'hopps.oidc.loggedOut';
// Query parameter for entry links from a provider's portal (the application's launch URL, e.g.
// `https://hopps.example.org/?login`). Arriving through it is an explicit wish to be logged in, so it overrides an
// earlier logout in the same tab.
const LOGIN_PARAM = 'login';
// Keycloak's own hint parameter. In the URL it pins the login to a single brokered identity provider
// and skips Keycloak's provider chooser, so a portal that has already authenticated the user can link
// straight through to the matching broker. The alias is never hardcoded — each entry link carries its
// own, which is what lets several providers share this one path. Other providers never see it.
const IDP_HINT_PARAM = 'kc_idp_hint';
// A single failed refresh is usually a transient hiccup (network blip, momentary outage of the provider), not an
// ended session — retry a few times before giving up.
const MAX_REFRESH_ATTEMPTS = 3;

/**
 * Logs in against an OpenID Connect provider, Keycloak and Authentik alike, with the authorization code flow.
 *
 * On startup it silently checks for an existing session at the provider (people often arrive from a portal already
 * logged in), and a login returns to the page it started on. The provider only needs one redirect URI, the SPA's
 * root: the page to return to travels in the OIDC state.
 */
export class AuthService {
    private readonly userManager: UserManager;
    private user: OidcUser | null = null;
    private refreshInFlight: Promise<boolean> | null = null;

    constructor(authority: string, clientId: string, scope: string) {
        this.userManager = new UserManager({
            authority,
            client_id: clientId,
            redirect_uri: `${window.location.origin}/`,
            post_logout_redirect_uri: `${window.location.origin}/`,
            scope,
            loadUserInfo: true,
            // Renews the access token with the refresh token shortly before it expires. Each renewal also resets the
            // provider's idle timeout, so an open (even backgrounded) tab stays logged in.
            automaticSilentRenew: true,
        });

        this.userManager.events.addUserLoaded((user) => this.setUser(user));
        this.userManager.events.addAccessTokenExpired(() => {
            void this.refreshToken();
        });
    }

    async init(): Promise<boolean> {
        try {
            if (this.isLoginCallback()) {
                console.info('[auth] handling the login callback');
                await this.completeLogin();
                return true;
            }
            if (this.consumeLoginParam()) {
                console.info('[auth] entry link with ?login, forgetting an earlier logout in this tab');
                this.loggedOutMarker('clear');
            }

            const stored = await this.userManager.getUser();
            if (stored && !stored.expired) {
                console.info('[auth] session restored from storage');
                this.setUser(stored);
                return true;
            }
            if (stored?.refresh_token && (await this.refreshToken())) {
                return true;
            }
            if (this.loggedOutMarker('get')) {
                console.info('[auth] logged out in this tab, not checking for a session at the provider');
                return true;
            }

            // Ask the provider for a session without showing it. The answer comes back as a login callback, which
            // the next init() handles.
            console.info('[auth] checking for a session at the provider (prompt=none)');
            await this.userManager.signinRedirect({ prompt: 'none', state: this.currentPath() });
            return new Promise<boolean>(() => {
                // never settles: the browser is already navigating to the provider
            });
        } catch (error) {
            console.error('Failed to initialize OIDC login:', error);
            this.clearUser();
            return false;
        }
    }

    /**
     * Read the hint per call rather than once at construction: init() runs its session check before the
     * guard decides a login is needed, so the URL is only inspected at the moment we actually redirect.
     */
    async login(redirectUri?: string) {
        const idpHint = new URLSearchParams(window.location.search).get(IDP_HINT_PARAM);

        this.loggedOutMarker('clear');
        await this.userManager.signinRedirect({
            state: this.toPath(redirectUri),
            extraQueryParams: idpHint ? { [IDP_HINT_PARAM]: idpHint } : undefined,
        });
    }

    /**
     * Ends the session at the provider's end-session endpoint. The auth state is deliberately left alone until the page
     * unloads: flipping it would make AuthGuard start a new login that races this redirect and wins.
     */
    async logout() {
        this.loggedOutMarker('set');
        try {
            await this.userManager.signoutRedirect();
        } catch (error) {
            // e.g. the provider has no end-session endpoint: fall back to forgetting the tokens locally
            console.error('Logout at the provider failed, logging out locally:', error);
            await this.userManager.removeUser();
            window.location.assign('/');
        }
    }

    isAuthenticated(): boolean {
        return this.user != null && !this.user.expired;
    }

    getAuthToken() {
        return this.user?.access_token;
    }

    /**
     * Renews the access token with the refresh token. Concurrent callers (the automatic renewal racing a 401 retry,
     * several parallel requests) share a single in-flight refresh so one expiry never triggers several parallel
     * refreshes — or several parallel logout decisions.
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
     * Tries to renew the access token, tolerating transient failures. Only a genuinely ended session — the provider
     * answers the refresh with an OAuth error, e.g. because the refresh token has expired — drops the auth state. A
     * network blip or momentary outage is retried with a short backoff and, if still failing while the access token
     * is valid, leaves the user logged in for the next attempt.
     */
    private async doRefreshWithRetry(): Promise<boolean> {
        for (let attempt = 1; attempt <= MAX_REFRESH_ATTEMPTS; attempt++) {
            try {
                const user = await this.userManager.signinSilent();
                if (user) {
                    this.setUser(user);
                    return true;
                }
                break;
            } catch (e) {
                if (e instanceof ErrorResponse) {
                    console.error('Token refresh rejected by the provider, the session has ended:', e);
                    await this.userManager.removeUser();
                    this.clearUser();
                    return false;
                }
                console.warn(`Token refresh failed (attempt ${attempt}/${MAX_REFRESH_ATTEMPTS}), will retry:`, e);
                if (attempt < MAX_REFRESH_ATTEMPTS) {
                    await this.delay(attempt * 1000);
                }
            }
        }
        // Keep a still valid token for the next attempt; only an expired one ends the session.
        if (!this.isAuthenticated()) {
            this.clearUser();
        }
        return false;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private isLoginCallback(): boolean {
        const params = new URLSearchParams(window.location.search);
        return params.has('state') && (params.has('code') || params.has('error'));
    }

    /** Exchanges the code from the provider's redirect for tokens, then puts back the URL the login started on. */
    private async completeLogin() {
        let returnTo: unknown = '/';
        try {
            const user = await this.userManager.signinRedirectCallback();
            console.info('[auth] logged in');
            this.setUser(user);
            returnTo = user.state;
        } catch (error) {
            if (error instanceof ErrorResponse) {
                returnTo = error.state;
            }
            if (error instanceof ErrorResponse && error.error && NO_SESSION_ERRORS.has(error.error)) {
                console.info(`[auth] no usable session at the provider: ${error.error}`);
            } else {
                console.error('[auth] login callback failed:', error);
            }
            this.clearUser();
        }
        // The router mounts only after init(), so it starts on this URL instead of the callback one.
        window.history.replaceState(null, '', typeof returnTo === 'string' ? returnTo : '/');
    }

    /** Whether the URL carries {@link LOGIN_PARAM}. Removes it, so neither the router nor a reload sees it again. */
    private consumeLoginParam(): boolean {
        const url = new URL(window.location.href);
        if (!url.searchParams.has(LOGIN_PARAM)) {
            return false;
        }
        url.searchParams.delete(LOGIN_PARAM);
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
        return true;
    }

    /** sessionStorage can be unavailable (privacy modes); then the marker is simply not kept. */
    private loggedOutMarker(action: 'get' | 'set' | 'clear'): boolean {
        try {
            if (action === 'set') {
                sessionStorage.setItem(LOGGED_OUT_KEY, '1');
            } else if (action === 'clear') {
                sessionStorage.removeItem(LOGGED_OUT_KEY);
            }
            return sessionStorage.getItem(LOGGED_OUT_KEY) === '1';
        } catch {
            return false;
        }
    }

    private currentPath(): string {
        return `${window.location.pathname}${window.location.search}${window.location.hash}`;
    }

    /** Callers pass absolute URLs; only a same-origin path is carried through the state. */
    private toPath(redirectUri?: string): string {
        if (!redirectUri) {
            return this.currentPath();
        }
        const url = new URL(redirectUri, window.location.origin);
        return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : '/';
    }

    private setUser(user: OidcUser) {
        this.user = user;
        useStore.getState().setIsAuthenticated(true);
        useStore.getState().setUser(user.profile as unknown as User);
    }

    private clearUser() {
        this.user = null;
        useStore.getState().setIsAuthenticated(false);
        useStore.getState().setUser(null);
    }
}

function createAuthService(): AuthService {
    if (!oidcProviderUrl || !oidcClientId) {
        // Fail at startup rather than at the first login: without them the provider rejects every request.
        throw new Error('VITE_OIDC_PROVIDER_URL and VITE_OIDC_CLIENT_ID must both be set, they tell the SPA where to log in.');
    }
    return new AuthService(oidcProviderUrl, oidcClientId, oidcScope);
}

const authService = createAuthService();
export default authService;
