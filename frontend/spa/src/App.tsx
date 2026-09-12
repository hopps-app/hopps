import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';

import AppRoutes from './AppRoutes';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { NoAccessView } from '@/components/NoAccessView';
import { OrganizationErrorView } from '@/components/OrganizationErrorView';
import authService from '@/services/auth/auth.service.ts';
import connectivityService from '@/services/ConnectivityService.ts';
import emojiService from '@/services/EmojiService';
import { fetchInstanceInfo } from '@/services/instance/instanceService';
import languageService from '@/services/LanguageService.ts';
import themeService from '@/services/ThemeService.ts';
import { useStore } from '@/store/store.ts';

function App() {
    const { isInitialized, setIsInitialized, organizationError, isAuthenticated, instance } = useStore();
    // const queryClient = useQueryClient();
    const loadUserOrganisation = async () => {
        const apiService = (await import('@/services/ApiService.ts')).default;
        const user = useStore.getState().user;

        if (!user) {
            useStore.getState().setOrganization(null);
            useStore.getState().setOrganizationError(false);
            return;
        }

        try {
            const organisation = await apiService.orgService.myGET();
            useStore.getState().setOrganization(organisation);
            useStore.getState().setOrganizationError(false);
        } catch (error: unknown) {
            // 403 NO_ORGANIZATION_ACCESS: the account can log in but is not a member of any organization (older
            // backends said 404). Any other failure lands on the same screen for now, so the two are not told apart.
            console.error('Failed to load organization:', error);
            useStore.getState().setOrganization(null);
            useStore.getState().setOrganizationError(true);
        }
    };

    useEffect(() => {
        const initApp = async () => {
            try {
                themeService.init();
                languageService.init();
                await emojiService.init();

                await connectivityService.checkAll();

                const { keycloakReachable, backendReachable } = useStore.getState();

                if (backendReachable) {
                    // Needed before login: decides whether the start page offers sign-up, the initial setup, or
                    // only the login, and what to show someone who is logged in but has no organization.
                    useStore.getState().setInstance(await fetchInstanceInfo());
                }

                if (keycloakReachable) {
                    const success = await authService.init();
                    if (success && authService.isAuthenticated() && backendReachable) {
                        await loadUserOrganisation();
                    }
                }
            } catch (e) {
                console.error('App initialisation failed:', e);
            } finally {
                setIsInitialized(true);
            }
        };
        initApp();
    }, [setIsInitialized]);

    // Logged in, but no organization: on a single-tenant installation there is nothing to create, the person has to
    // be invited by an administrator. On the hosted SaaS they create their own organization.
    if (isInitialized && isAuthenticated && organizationError) {
        return instance?.tenancy === 'single' ? <NoAccessView /> : <OrganizationErrorView />;
    }

    return isInitialized ? (
        <ErrorBoundary>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </ErrorBoundary>
    ) : null;
}

export default App;
