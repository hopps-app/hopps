import { useEffect, useState } from 'react';

import Layout from '@/layouts/default/Layout.tsx';
import themeService from '@/services/ThemeService.ts';
import authService from './services/auth/AuthService';
import emojiService from './services/EmojiService';

function App() {
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        themeService.init();
        authService.init().catch((e) => console.error('Failed to init authService:', e));
        emojiService.init().catch((e) => console.error('Failed to init emojiService:', e));

        setIsInitialized(true);
    }, []);

    return isInitialized ? <Layout /> : null;
}

export default App;
