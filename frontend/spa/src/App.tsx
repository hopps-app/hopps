import { useEffect, useState } from 'react';

import Layout from '@/layouts/default/Layout.tsx';
import themeService from '@/services/ThemeService.ts';
import authService from './services/auth/AuthService';

function App() {
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        themeService.init();
        authService.init().catch((e) => console.error('Failed to init authService:', e));

        setIsInitialized(true);
    }, []);

    return isInitialized ? <Layout /> : null;
}

export default App;
