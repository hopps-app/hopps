import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '@/services/auth/auth.service.ts';
import { useStore } from '@/store/store';

// Mock types
type MockKeycloak = {
    init: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    updateToken: ReturnType<typeof vi.fn>;
    loadUserInfo: ReturnType<typeof vi.fn>;
    authenticated: boolean;
    isTokenExpired: ReturnType<typeof vi.fn>;
    token: string;
    onAuthSuccess: (() => void) | null;
    onAuthLogout: (() => void) | null;
    onAuthError: ((error: any) => void) | null;
};

// Mock Keycloak class
vi.mock('keycloak-js', () => {
    return {
        default: vi.fn().mockImplementation(() => {
            return {
                init: vi.fn().mockResolvedValue(true),
                login: vi.fn().mockResolvedValue(undefined),
                logout: vi.fn().mockResolvedValue(undefined),
                updateToken: vi.fn().mockResolvedValue(true),
                loadUserInfo: vi.fn().mockResolvedValue({ id: 'mock-id', name: 'Mock User' }),
                authenticated: true,
                isTokenExpired: vi.fn().mockReturnValue(false),
                token: 'mock-token',
                onAuthSuccess: null,
                onAuthLogout: null,
                onAuthError: null,
            };
        }),
    };
});

// Mock store with correct typing
vi.mock('@/store/store', () => ({
    useStore: {
        getState: vi.fn(),
    },
}));

describe('AuthService', () => {
    let authService: AuthService;
    let mockStore: {
        setIsAuthenticated: ReturnType<typeof vi.fn>;
        setUser: ReturnType<typeof vi.fn>;
        setOrganization: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        mockStore = {
            setIsAuthenticated: vi.fn(),
            setUser: vi.fn(),
            setOrganization: vi.fn(),
        };
        (useStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

        authService = new AuthService();

        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
            },
            writable: true,
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize successfully', async () => {
        const result = await authService.init();
        expect(result).toBe(true);

        const keycloak = authService['keycloak'] as unknown as MockKeycloak;
        expect(keycloak.init).toHaveBeenCalledWith({
            enableLogging: true,
            onLoad: 'check-sso',
            checkLoginIframe: false,
        });
        expect(mockStore.setIsAuthenticated).toHaveBeenCalledWith(true);
    });

    it('should call login on the keycloak instance', async () => {
        await authService.login();
        const keycloak = authService['keycloak'] as unknown as MockKeycloak;
        expect(keycloak.login).toHaveBeenCalled();
    });

    it('should call logout on the keycloak instance', async () => {
        await authService.logout();
        const keycloak = authService['keycloak'] as unknown as MockKeycloak;
        expect(keycloak.logout).toHaveBeenCalled();
    });

    it('should update auth state when onAuthSuccess is triggered', async () => {
        const keycloak = authService['keycloak'] as unknown as MockKeycloak;

        if (keycloak.onAuthSuccess) {
            keycloak.onAuthSuccess();
            expect(mockStore.setIsAuthenticated).toHaveBeenCalledWith(true);
        }
    });

    it('should update auth state when onAuthLogout is triggered', async () => {
        const keycloak = authService['keycloak'] as unknown as MockKeycloak;

        if (keycloak.onAuthLogout) {
            keycloak.onAuthLogout();
            expect(mockStore.setIsAuthenticated).toHaveBeenCalledWith(false);
            expect(mockStore.setUser).toHaveBeenCalledWith(null);
        }
    });

    it('should check authentication status correctly', () => {
        const keycloak = authService['keycloak'] as unknown as MockKeycloak;

        // Test when authenticated and token is valid
        keycloak.authenticated = true;
        vi.spyOn(keycloak, 'isTokenExpired').mockReturnValue(false);
        expect(authService.isAuthenticated()).toBe(true);

        // Test when token is expired
        vi.spyOn(keycloak, 'isTokenExpired').mockReturnValue(true);
        expect(authService.isAuthenticated()).toBe(false);

        // Test when not authenticated
        keycloak.authenticated = false;
        expect(authService.isAuthenticated()).toBe(false);
    });

    it('should get auth token from keycloak', () => {
        const keycloak = authService['keycloak'] as unknown as MockKeycloak;
        keycloak.token = 'test-token';
        expect(authService.getAuthToken()).toBe('test-token');
    });

    it('should load user info and update store', async () => {
        const mockUserData = { id: 'user-id', name: 'Test User' };
        const keycloak = authService['keycloak'] as unknown as MockKeycloak;
        vi.spyOn(keycloak, 'loadUserInfo').mockResolvedValue(mockUserData);

        await authService.loadUserInfo();

        expect(keycloak.loadUserInfo).toHaveBeenCalled();
        expect(mockStore.setUser).toHaveBeenCalledWith(mockUserData);
    });

    it('should handle errors when loading user info', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const keycloak = authService['keycloak'] as unknown as MockKeycloak;
        vi.spyOn(keycloak, 'loadUserInfo').mockRejectedValue(new Error('Failed to load'));

        await authService.loadUserInfo();

        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load user info', expect.any(Error));
    });

    it('should attempt to refresh token', async () => {
        const keycloak = authService['keycloak'] as unknown as MockKeycloak;
        await authService.refreshToken();
        expect(keycloak.updateToken).toHaveBeenCalledWith(5);
    });
});
