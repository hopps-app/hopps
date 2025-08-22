import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';

import emojiService from '@/services/EmojiService';
import languageService from '@/services/LanguageService.ts';
import { useStore } from '@/store/store.ts';
import themeService from '@/services/ThemeService.ts';
import authService from '@/services/auth/auth.service.ts';
import AppRoutes from './AppRoutes';

function App() {
    const { isInitialized, setIsInitialized } = useStore();
    // const queryClient = useQueryClient();
    const loadUserOrganisation = async () => {
        const apiService = (await import('@/services/ApiService.ts')).default;
        const user = useStore.getState().user;

        if (!user) {
            useStore.getState().setOrganization(null);
            return;
        }

        const organisation = await apiService.orgService.my();

        useStore.getState().setOrganization(organisation);
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

    return isInitialized ? (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    ) : null;
}

export default App;
