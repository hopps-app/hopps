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
        authService.login(`${window.location.origin}/dashboard`);
    };

    const loginDisabled = keycloakReachable === false;
    const registerDisabled = keycloakReachable === false || backendReachable === false;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
            <ConnectivityBanner />
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 w-full max-w-4xl">
                <img src="/logo.svg" alt="Hopps" className="h-32 md:h-64 w-auto shrink-0" />
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <img src="/logo3.svg" alt="Hopps" className="h-12 md:h-16 w-auto mb-4" />
                    <p className="text-base md:text-lg text-black/70 dark:text-white/70 max-w-xl mb-8">{t('home.subtitle')}</p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <TooltipProvider>
                            {registerDisabled ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0} className="w-full sm:w-auto">
                                            <Button disabled className="w-full sm:w-auto">
                                                {t('home.register')}
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('connectivity.buttonDisabledHint')}</TooltipContent>
                                </Tooltip>
                            ) : (
                                <Button onClick={onClickRegister} className="w-full sm:w-auto">
                                    {t('home.register')}
                                </Button>
                            )}

                            {loginDisabled ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0} className="w-full sm:w-auto">
                                            <Button variant="outline" disabled className="w-full sm:w-auto">
                                                {t('home.login')}
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('connectivity.buttonDisabledHint')}</TooltipContent>
                                </Tooltip>
                            ) : (
                                <Button variant="outline" onClick={onClickLogin} className="w-full sm:w-auto">
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
