import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button.tsx';
import HeaderMobileMenuButton from '@/layouts/default/HeaderMobileMenuButton.tsx';
import authService from '@/services/auth/AuthService.ts';
import { useStore } from '@/store/store.ts';
import UserMenu from '@/layouts/default/UserMenu.tsx';

function Header() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const menuItems = [
        { url: '/', label: 'Home' },
        { url: '/demo', label: 'Demo' },
    ];

    const appStore = useStore();
    const isAuthenticated = appStore.isAuthenticated;

    const onClickLogin = () => {
        authService.login();
    };

    const onClickRegister = () => {
        navigate('/register');
    };

    return (
        <header className="mb-auto flex flex-wrap sm:justify-start sm:flex-nowrap z-50 w-full text-sm py-4">
            <nav className="w-full sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center justify-between flex-shrink-0 ">
                    <HeaderMobileMenuButton />

                    <Link to="/" className="flex-none text-xl font-semibold text-white focus:outline-none focus:opacity-80" aria-label="Hopps">
                        <img src="/logo2.svg" alt="Hopps" />
                    </Link>

                    <div className="sm:hidden">
                        <Button>Call to action</Button>
                    </div>
                </div>
                <div
                    id="hs-navbar-cover-page"
                    className="hs-collapse overflow-hidden transition-all duration-300 basis-full grow flex justify-between flex-row"
                    aria-labelledby="hs-navbar-cover-page-collapse"
                >
                    <div className="flex flex-row">
                        <div className="w-10 shrink"></div>
                        <div className="flex gap-10 flex-row items-center ps-5">
                            {menuItems.map(({ url, label }) => {
                                return (
                                    <Link
                                        to={url}
                                        key={url}
                                        className="font-normal text-xl text-black/70 dark:text-white underline-offset-4 focus:outline-none focus:underline hover:underline"
                                    >
                                        {label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    {isAuthenticated ? (
                        <UserMenu />
                    ) : (
                        <div className="flex flex-row gap-5 items-center mt-0 ps-5">
                            <Button variant="link" className="px-0" onClick={onClickLogin}>
                                {t('header.login')}
                            </Button>
                            <Button onClick={onClickRegister}>{t('header.register')}</Button>
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
}

export default Header;
