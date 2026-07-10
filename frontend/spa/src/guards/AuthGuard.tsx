import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import authService from '@/services/auth/auth.service.ts';
import { useStore } from '@/store/store.ts';

interface AuthGuardProps {
    children: ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { isInitialized, isAuthenticated, keycloakReachable } = useStore();
    const location = useLocation();

    const shouldLogin = isInitialized && keycloakReachable !== false && !isAuthenticated;

    useEffect(() => {
        if (!shouldLogin) {
            return;
        }
        // Send the user back to where they were once they re-authenticate.
        const returnTo = `${window.location.origin}${location.pathname}${location.search}`;
        authService.login(returnTo);
    }, [shouldLogin, location.pathname, location.search]);

    if (!isInitialized) {
        return null;
    }

    if (keycloakReachable === false) {
        return <Navigate to="/" replace />;
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
};

export default AuthGuard;
