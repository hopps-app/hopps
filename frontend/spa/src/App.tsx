import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { OrganizationErrorView } from '@/components/OrganizationErrorView';
import emojiService from '@/services/EmojiService';
import languageService from '@/services/LanguageService.ts';
import { useStore } from '@/store/store.ts';
import themeService from '@/services/ThemeService.ts';
import authService from '@/services/auth/auth.service.ts';
import AppRoutes from './AppRoutes';

function App() {
    const { isInitialized, setIsInitialized, organizationError, isAuthenticated } = useStore();
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
            const organisation = await apiService.orgService.my();
            useStore.getState().setOrganization(organisation);
            useStore.getState().setOrganizationError(false);
        } catch (error: unknown) {
            console.error('Failed to load organization:', error);

            // Check if it's a 404 error (organization not found)
            const isNotFoundError =
                error &&
                typeof error === 'object' &&
                'response' in error &&
                error.response &&
                typeof error.response === 'object' &&
                'status' in error.response &&
                error.response.status === 404;

            if (isNotFoundError) {
                useStore.getState().setOrganization(null);
                useStore.getState().setOrganizationError(true);
            } else {
                // For other errors, we might want to handle differently
                // For now, we'll also show the error state
                useStore.getState().setOrganization(null);
                useStore.getState().setOrganizationError(true);
            }
        }
    };

    useEffect(() => {
        const initApp = async () => {
            try {
                themeService.init();
                languageService.init();
                await emojiService.init();

                const success = await authService.init();
                if (success && authService.isAuthenticated()) {
                    await loadUserOrganisation();
                }
                setIsInitialized(true);
            } catch (e) {
                console.error('App initialisation failed:', e);
            }
        };
        initApp();
    }, []);

    // Show organization error view if user is authenticated but has no organization
    if (isInitialized && isAuthenticated && organizationError) {
        return <OrganizationErrorView />;
    }

    return isInitialized ? (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    ) : null;
}

export default App;
