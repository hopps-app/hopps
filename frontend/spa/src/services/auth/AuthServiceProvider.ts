export interface AuthServiceProvider {
    init(): Promise<void>;

    login(): Promise<void>;

    logout(): Promise<void>;

    checkLogin(): Promise<void>;

    isAuthenticated(): boolean;

    refreshToken(refreshToken: string): void;

    getAuthToken(): string | undefined;
}
