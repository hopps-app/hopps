import { ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import authService from '@/services/auth/auth.service';
import { useStore } from '@/store/store';

interface AdminGuardProps {
    children: ReactNode;
}

/**
 * Gates the admin app on the admin realm role.
 *
 * Three outcomes, and the middle one is why this can't reuse the spa AuthGuard:
 *  - not authenticated        -> bounce to Keycloak
 *  - authenticated, no role   -> render a denial. Redirecting to login here would loop,
 *                                because the user already has a valid session.
 *  - authenticated, has role  -> render the app
 */
const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
    const { isInitialized, isAuthenticated, isAdmin, keycloakReachable } = useStore();
    const { t } = useTranslation();

    const shouldLogin = isInitialized && keycloakReachable !== false && !isAuthenticated;

    useEffect(() => {
        if (!shouldLogin) {
            return;
        }
        const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
        authService.login(returnTo);
    }, [shouldLogin]);

    if (!isInitialized) {
        return null;
    }

    if (keycloakReachable === false) {
        return (
            <div className="flex h-screen items-center justify-center p-6">
                <p className="text-sm text-grey-800">{t('auth.keycloakUnreachable')}</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (!isAdmin) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
                <h1 className="text-2xl font-semibold">{t('auth.forbidden.title')}</h1>
                <p className="max-w-md text-sm text-grey-800">{t('auth.forbidden.description')}</p>
                <button
                    type="button"
                    onClick={() => authService.logout().catch((e) => console.error('Failed to logout:', e))}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                    {t('menu.logout')}
                </button>
            </div>
        );
    }

    return <>{children}</>;
};

export default AdminGuard;
