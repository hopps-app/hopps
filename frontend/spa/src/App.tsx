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
        themeService.init();
        languageService.init();

        authService
            .init()
            .then(async (success) => {
                if (success) {
                    await loadUserOrganisation();
                }
            })
            .catch((e) => console.error('Failed to init authService:', e));
        emojiService.init().catch((e) => console.error('Failed to init emojiService:', e));

        setIsInitialized(true);
    }, []);

    return isInitialized ? <Layout /> : null;
}

export default App;
