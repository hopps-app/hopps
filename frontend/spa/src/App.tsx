import { useEffect } from 'react';

import Layout from '@/layouts/default/Layout.tsx';
import themeService from '@/services/ThemeService.ts';
import emojiService from '@/services/EmojiService';
import languageService from '@/services/LanguageService.ts';
import authService from '@/services/auth/auth.service.ts';
import { useStore } from '@/store/store.ts';

function App() {
    const { isInitialized, setIsInitialized } = useStore();
    const loadUserOrganisation = async () => {
        const apiService = (await import('@/services/ApiService.ts')).default;
        const user = useStore.getState().user;

        if (!user) {
            useStore.getState().setOrganization(null);
            return;
        }

        const organisation = await apiService.organization.getCurrentOrganization();

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
                console.error('Failed to init authService:', e);
            }
        };
        initApp();
    }, []);

    return isInitialized ? <Layout /> : null;
}

export default App;
