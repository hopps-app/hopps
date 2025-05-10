import { useEffect, useState } from 'react';

import Layout from '@/layouts/default/Layout.tsx';
import authService from '@/services/auth/AuthService';
import emojiService from '@/services/EmojiService';
import languageService from '@/services/LanguageService.ts';
import themeService from '@/services/ThemeService.ts';

function App() {
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        themeService.init();
        languageService.init();

        authService.init().catch((e) => console.error('Failed to init authService:', e));
        emojiService.init().catch((e) => console.error('Failed to init emojiService:', e));

        setIsInitialized(true);
    }, []);

    return isInitialized ? <Layout /> : null;
}

export default App;
