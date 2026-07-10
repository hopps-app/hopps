import { useEffect, useRef } from 'react';
import { BrowserRouter } from 'react-router-dom';

import AppRoutes from '@/AppRoutes';
import authService from '@/services/auth/auth.service';

function App() {
    // StrictMode double-invokes effects in dev; keycloak-js throws if init() runs twice.
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) {
            return;
        }
        initialized.current = true;
        authService.init().catch((e) => console.error('Failed to initialize auth:', e));
    }, []);

    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}

export default App;
