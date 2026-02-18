import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/ui/Button.tsx';
import authService from '@/services/auth/auth.service.ts';
import { useStore } from '@/store/store.ts';

function HomeView() {
    const { t } = useTranslation();
    const { isAuthenticated, isInitialized } = useStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (isInitialized && isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, isInitialized, navigate]);

    const onClickRegister = () => {
        navigate('/register');
    };

    const onClickLogin = () => {
        authService.login();
    };

    return (
        <div className="flex flex-row items-center justify-center gap-16 min-h-screen">
            <img src="/logo2.svg" alt="Hopps" className="h-32 w-auto shrink-0" />
            <div className="flex flex-col">
                <h1 className="text-4xl font-semibold mb-4">{t('home.title')}</h1>
                <p className="text-lg text-black/70 dark:text-white/70 max-w-xl mb-8">{t('home.subtitle')}</p>
                <div className="flex flex-row gap-4">
                    <Button onClick={onClickRegister}>{t('home.register')}</Button>
                    <Button variant="outline" onClick={onClickLogin}>
                        {t('home.login')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default HomeView;
