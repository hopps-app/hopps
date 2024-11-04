import { ReactNode, useEffect } from 'react';

import authService from '@/services/auth/AuthService.ts';
import { useAuthStore } from '@/store/store.ts';

interface AuthGuardProps {
    children: ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { isInitialized, isAuthenticated } = useAuthStore();

    useEffect(() => {}, [isInitialized]);

    if (!isInitialized) return null;

    if (!isAuthenticated) {
        authService.login();
        return null;
    }

    return <>{children}</>;
};

export default AuthGuard;
