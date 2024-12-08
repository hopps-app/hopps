import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AuthService } from '@/services/auth/AuthService';
import { AuthServiceProvider } from '../AuthServiceProvider';
import { useAuthStore } from '@/store/store';

vi.mock('@/services/auth/AuthServiceProvider');
vi.mock('@/store/store', () => ({ useAuthStore: { getState: vi.fn() } }));

describe('AuthService', () => {
    let authService: AuthService;
    let provider: AuthServiceProvider;

    beforeEach(() => {
        provider = {
            init: vi.fn(),
            login: vi.fn(),
            logout: vi.fn(),
            checkLogin: vi.fn(),
            isAuthenticated: vi.fn(),
            refreshToken: vi.fn(),
        };

        useAuthStore.getState.mockReturnValue({
            setIsAuthenticated: vi.fn(),
            setUser: vi.fn(),
        });

        authService = new AuthService(provider);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize and start token refresh if authenticated', async () => {
        vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
        vi.spyOn(authService, 'startTokenRefresh');

        await authService.init();

        expect(authService.isAuthenticated).toHaveBeenCalled();
        expect(authService.startTokenRefresh).toHaveBeenCalled();
    });

    it('should login using provider', () => {
        authService.login();
        expect(provider.login).toHaveBeenCalled();
    });

    it('should logout and stop token refresh', async () => {
        vi.spyOn(authService, 'stopTokenRefresh');
        await authService.logout();

        expect(provider.logout).toHaveBeenCalled();
        expect(authService.stopTokenRefresh).toHaveBeenCalled();
        expect(localStorage.getItem('AUTH_TOKEN')).toBe('');
        expect(localStorage.getItem('AUTH_TOKEN_REFRESH')).toBe('');
    });

    it('should set auth tokens', () => {
        authService.setAuthTokens('token', 'refreshToken');
        expect(localStorage.getItem('AUTH_TOKEN')).toBe('token');
        expect(localStorage.getItem('AUTH_TOKEN_REFRESH')).toBe('refreshToken');
    });

    it('should get auth token', () => {
        localStorage.setItem('AUTH_TOKEN', 'token');
        expect(authService.getAuthToken()).toBe('token');
    });

    it('should get auth refresh token', () => {
        localStorage.setItem('AUTH_TOKEN_REFRESH', 'refreshToken');
        expect(authService.getAuthRefreshToken()).toBe('refreshToken');
    });

    it('should set auth user', () => {
        const userData = { name: 'John Doe', email: 'john.doe@example.com' };
        authService.setAuthUser(userData);

        expect(useAuthStore.getState().setIsAuthenticated).toHaveBeenCalledWith(true);
        expect(useAuthStore.getState().setUser).toHaveBeenCalledWith(userData);
    });

    it('should call refresh token on provider', async () => {
        localStorage.setItem('AUTH_TOKEN_REFRESH', 'refreshToken');
        await authService.refreshToken();

        expect(provider.refreshToken).toHaveBeenCalledWith('refreshToken');
    });

    it('should start and stop token refresh interval', () => {
        authService.refreshToken = vi.fn().mockResolvedValue(undefined);
        vi.spyOn(window, 'setInterval').mockImplementation((callback) => {
            callback();
            return 1;
        });
        vi.spyOn(window, 'clearInterval');

        authService.startTokenRefresh();
        expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 30000);
        expect(authService.refreshToken).toHaveBeenCalled();

        authService.stopTokenRefresh();
        expect(clearInterval).toHaveBeenCalled();
    });
});
