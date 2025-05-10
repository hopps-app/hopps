import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useStore } from '@/store/store.ts';
import authService from '@/services/auth/auth.service.ts';

interface AuthGuardProps {
    children: ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { isInitialized, isAuthenticated } = useStore();
    const location = useLocation();

    useEffect(() => {
        if (isInitialized && !isAuthenticated) {
            authService.checkLogin();
        }
    }, [isInitialized, isAuthenticated]);

    if (!isInitialized) {
        return null;
    }

    if (!isAuthenticated) {
        // Store the current path for redirect after login
        const currentPath = location.pathname + location.search + location.hash;
        if (currentPath && currentPath !== '/') {
            window.localStorage.setItem('REDIRECT_PATH', currentPath);
        }

        authService.login();

        return null;
    }

    return <>{children}</>;
};

export default AuthGuard;
