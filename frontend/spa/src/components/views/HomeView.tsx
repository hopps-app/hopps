import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ConnectivityBanner } from '@/components/common/ConnectivityBanner/ConnectivityBanner';
import Button from '@/components/ui/Button.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/shadecn/Tooltip';
import authService from '@/services/auth/auth.service.ts';
import { useStore } from '@/store/store.ts';

function HomeView() {
    const { t } = useTranslation();
    const { isAuthenticated, isInitialized, keycloakReachable, backendReachable } = useStore();
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

    const loginDisabled = keycloakReachable === false;
    const registerDisabled = keycloakReachable === false || backendReachable === false;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
            <ConnectivityBanner />
            <div className="flex flex-row items-center justify-center gap-16">
                <img src="/logo.svg" alt="Hopps" className="h-64 w-auto shrink-0" />
                <div className="flex flex-col">
                    <img src="/logo3.svg" alt="Hopps" className="h-16 w-auto self-start mb-4" />
                    <p className="text-lg text-black/70 dark:text-white/70 max-w-xl mb-8">{t('home.subtitle')}</p>
                    <div className="flex flex-row gap-4">
                        <TooltipProvider>
                            {registerDisabled ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0}>
                                            <Button disabled>{t('home.register')}</Button>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('connectivity.buttonDisabledHint')}</TooltipContent>
                                </Tooltip>
                            ) : (
                                <Button onClick={onClickRegister}>{t('home.register')}</Button>
                            )}

                            {loginDisabled ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0}>
                                            <Button variant="outline" disabled>
                                                {t('home.login')}
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('connectivity.buttonDisabledHint')}</TooltipContent>
                                </Tooltip>
                            ) : (
                                <Button variant="outline" onClick={onClickLogin}>
                                    {t('home.login')}
                                </Button>
                            )}
                        </TooltipProvider>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomeView;
