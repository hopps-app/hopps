import type { AuthService } from '@/services/auth/AuthService.ts';

export interface AuthServiceProvider {
    init(authService: AuthService): Promise<void>;

    login(): Promise<void>;

    logout(): Promise<void>;

    checkLogin(): Promise<void>;
}
