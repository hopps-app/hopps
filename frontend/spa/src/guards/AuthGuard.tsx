import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import authService from '@/services/auth/auth.service.ts';
import { useStore } from '@/store/store.ts';

interface AuthGuardProps {
    children: ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { isInitialized, isAuthenticated, keycloakReachable } = useStore();

    if (!isInitialized) {
        return null;
    }

    if (keycloakReachable === false) {
        return <Navigate to="/" replace />;
    }

    if (!isAuthenticated) {
        authService.login();
        return null;
    }

    return <>{children}</>;
};

export default AuthGuard;
