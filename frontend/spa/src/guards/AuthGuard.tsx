import { ReactNode } from 'react';

import authService from '@/services/auth/auth.service.ts';
import { useStore } from '@/store/store.ts';

interface AuthGuardProps {
    children: ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { isInitialized, isAuthenticated } = useStore();

    if (!isInitialized) {
        return null;
    }

    if (!isAuthenticated) {
        authService.login();
        return null;
    }

    return <>{children}</>;
};

export default AuthGuard;
