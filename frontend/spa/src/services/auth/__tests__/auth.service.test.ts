import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '@/services/auth/auth.service.ts';
import { useStore } from '@/store/store';

type MockUserManager = {
    getUser: ReturnType<typeof vi.fn>;
    removeUser: ReturnType<typeof vi.fn>;
    signinRedirect: ReturnType<typeof vi.fn>;
    signinRedirectCallback: ReturnType<typeof vi.fn>;
    signinSilent: ReturnType<typeof vi.fn>;
    signoutRedirect: ReturnType<typeof vi.fn>;
    events: {
        addUserLoaded: ReturnType<typeof vi.fn>;
        addAccessTokenExpired: ReturnType<typeof vi.fn>;
    };
};

const { userManagerSettings, MockErrorResponse } = vi.hoisted(() => {
    class MockErrorResponse extends Error {
        constructor(
            public error: string,
            public state?: unknown
        ) {
            super(error);
        }
    }
    return { userManagerSettings: [] as unknown[], MockErrorResponse };
});

vi.mock('oidc-client-ts', () => ({
    ErrorResponse: MockErrorResponse,
    // Regular function (not an arrow) so it can be used with `new` — vitest 4 rejects `new` on arrow-based mocks.
    UserManager: vi.fn().mockImplementation(function (settings: unknown) {
        userManagerSettings.push(settings);
        return {
            getUser: vi.fn().mockResolvedValue(null),
            removeUser: vi.fn().mockResolvedValue(undefined),
            signinRedirect: vi.fn().mockResolvedValue(undefined),
            signinRedirectCallback: vi.fn(),
            signinSilent: vi.fn(),
            signoutRedirect: vi.fn().mockResolvedValue(undefined),
            events: {
                addUserLoaded: vi.fn(),
                addAccessTokenExpired: vi.fn(),
            },
        };
    }),
}));

vi.mock('@/services/auth/auth.config.ts', () => ({
    oidcProviderUrl: 'https://id.example.org/realms/hopps',
    oidcClientId: 'hopps-spa',
    oidcScope: 'openid profile email',
}));

vi.mock('@/store/store', () => ({
    useStore: {
        getState: vi.fn(),
    },
}));

const user = (overrides = {}) => ({
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    expired: false,
    profile: { sub: 'mock-id', name: 'Mock User' },
    state: '/dashboard',
    ...overrides,
});

describe('AuthService', () => {
    let authService: AuthService;
    let userManager: MockUserManager;
    let mockStore: {
        setIsAuthenticated: ReturnType<typeof vi.fn>;
        setUser: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        mockStore = {
            setIsAuthenticated: vi.fn(),
            setUser: vi.fn(),
        };
        (useStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

        sessionStorage.clear();
        window.history.replaceState(null, '', '/');
        userManagerSettings.length = 0;

        authService = new AuthService('https://id.example.org/realms/hopps', 'hopps-spa', 'openid profile email');
        userManager = authService['userManager'] as unknown as MockUserManager;
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('should configure the provider, client and scope it was given', () => {
        expect(userManagerSettings[0]).toMatchObject({
            authority: 'https://id.example.org/realms/hopps',
            client_id: 'hopps-spa',
            scope: 'openid profile email',
            redirect_uri: `${window.location.origin}/`,
        });
    });

    it('should restore a stored session on init', async () => {
        userManager.getUser.mockResolvedValue(user());

        await expect(authService.init()).resolves.toBe(true);

        expect(authService.isAuthenticated()).toBe(true);
        expect(authService.getAuthToken()).toBe('mock-token');
        expect(mockStore.setIsAuthenticated).toHaveBeenCalledWith(true);
        expect(mockStore.setUser).toHaveBeenCalledWith({ sub: 'mock-id', name: 'Mock User' });
        expect(userManager.signinRedirect).not.toHaveBeenCalled();
    });

    it('should silently ask the provider for a session when none is stored', () => {
        void authService.init();

        return vi.waitFor(() => expect(userManager.signinRedirect).toHaveBeenCalledWith({ prompt: 'none', state: '/' }));
    });

    it('should not ask the provider for a session after a logout in this tab', async () => {
        await authService.logout();

        await expect(authService.init()).resolves.toBe(true);

        expect(userManager.signoutRedirect).toHaveBeenCalled();
        expect(userManager.signinRedirect).not.toHaveBeenCalled();
        expect(authService.isAuthenticated()).toBe(false);
    });

    it('should complete the login from the callback and return to the page it started on', async () => {
        window.history.replaceState(null, '', '/?code=abc&state=xyz');
        userManager.signinRedirectCallback.mockResolvedValue(user());

        await expect(authService.init()).resolves.toBe(true);

        expect(authService.isAuthenticated()).toBe(true);
        expect(window.location.pathname).toBe('/dashboard');
        expect(window.location.search).toBe('');
    });

    it('should stay logged out when the provider has no session', async () => {
        window.history.replaceState(null, '', '/?error=login_required&state=xyz');
        userManager.signinRedirectCallback.mockRejectedValue(new MockErrorResponse('login_required', '/'));

        await expect(authService.init()).resolves.toBe(true);

        expect(authService.isAuthenticated()).toBe(false);
        expect(mockStore.setIsAuthenticated).toHaveBeenCalledWith(false);
    });

    it('should carry a same-origin return path through the login', async () => {
        await authService.login(`${window.location.origin}/dashboard`);

        expect(userManager.signinRedirect).toHaveBeenCalledWith({ state: '/dashboard', extraQueryParams: undefined });
    });

    it('should not return to a foreign origin after the login', async () => {
        await authService.login('https://evil.example.org/dashboard');

        expect(userManager.signinRedirect).toHaveBeenCalledWith({ state: '/', extraQueryParams: undefined });
    });

    it('should pass on an identity provider hint from the URL', async () => {
        window.history.replaceState(null, '', '/?kc_idp_hint=kollicloud');

        await authService.login();

        expect(userManager.signinRedirect).toHaveBeenCalledWith({
            state: '/?kc_idp_hint=kollicloud',
            extraQueryParams: { kc_idp_hint: 'kollicloud' },
        });
    });

    it('should fall back to a local logout when the provider has no end-session endpoint', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const assign = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign });
        userManager.signoutRedirect.mockRejectedValue(new Error('no end session endpoint'));

        await authService.logout();

        expect(userManager.removeUser).toHaveBeenCalled();
        expect(assign).toHaveBeenCalledWith('/');
        vi.unstubAllGlobals();
    });

    it('should refresh the token', async () => {
        userManager.signinSilent.mockResolvedValue(user({ access_token: 'renewed-token' }));

        await expect(authService.refreshToken()).resolves.toBe(true);

        expect(authService.getAuthToken()).toBe('renewed-token');
    });

    it('should share one refresh between concurrent callers', async () => {
        userManager.signinSilent.mockResolvedValue(user());

        await Promise.all([authService.refreshToken(), authService.refreshToken()]);

        expect(userManager.signinSilent).toHaveBeenCalledTimes(1);
    });

    it('should drop the auth state when the provider rejects the refresh', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        userManager.signinSilent.mockRejectedValue(new MockErrorResponse('invalid_grant'));

        await expect(authService.refreshToken()).resolves.toBe(false);

        expect(userManager.signinSilent).toHaveBeenCalledTimes(1);
        expect(userManager.removeUser).toHaveBeenCalled();
        expect(mockStore.setIsAuthenticated).toHaveBeenCalledWith(false);
        expect(mockStore.setUser).toHaveBeenCalledWith(null);
        // The provider already ended the session; redirecting to the end-session endpoint would be a redundant round trip.
        expect(userManager.signoutRedirect).not.toHaveBeenCalled();
    });

    it('should retry a refresh that failed for a transient reason', async () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        userManager.signinSilent.mockRejectedValueOnce(new Error('network down')).mockResolvedValue(user());

        const refresh = authService.refreshToken();
        await vi.runAllTimersAsync();

        await expect(refresh).resolves.toBe(true);
        expect(userManager.signinSilent).toHaveBeenCalledTimes(2);
    });

    it('should keep a still valid session when the refresh keeps failing for a transient reason', async () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        userManager.getUser.mockResolvedValue(user());
        await authService.init();
        mockStore.setIsAuthenticated.mockClear();
        userManager.signinSilent.mockRejectedValue(new Error('network down'));

        const refresh = authService.refreshToken();
        await vi.runAllTimersAsync();

        await expect(refresh).resolves.toBe(false);
        expect(userManager.signinSilent).toHaveBeenCalledTimes(3);
        expect(authService.isAuthenticated()).toBe(true);
        expect(mockStore.setIsAuthenticated).not.toHaveBeenCalledWith(false);
    });

    it('should refresh when the access token expired', async () => {
        userManager.signinSilent.mockResolvedValue(user());
        const onExpired = userManager.events.addAccessTokenExpired.mock.calls[0][0] as () => void;

        onExpired();

        await vi.waitFor(() => expect(userManager.signinSilent).toHaveBeenCalled());
    });
});
