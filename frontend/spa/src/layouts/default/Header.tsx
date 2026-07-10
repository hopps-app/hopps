import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import AlphaBadge from '@/components/ui/AlphaBadge';
import Button from '@/components/ui/Button.tsx';
import UserMenu from '@/layouts/default/UserMenu.tsx';
import authService from '@/services/auth/auth.service.ts';
import { useStore } from '@/store/store';

function Header() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useStore();

    // On the registration page the auth buttons are redundant — the page itself is
    // the register action, and a "log in instead" link sits below the form.
    const isRegisterPage = location.pathname === '/register';

    const onClickLogin = () => {
        authService.login(`${window.location.origin}/dashboard`);
    };

    const onClickRegister = () => {
        navigate('/register');
    };

    return (
        <header className="mb-auto flex flex-wrap sm:justify-start sm:flex-nowrap z-50 w-full text-sm py-4">
            <nav className="w-full sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center justify-between flex-shrink-0 ">
                    <Link to="/" className="flex-none text-xl font-semibold text-white focus:outline-none focus:opacity-80" aria-label="Hopps">
                        <img src="/logo2.svg" alt="Hopps" />
                    </Link>
                    <AlphaBadge />
                </div>
                <div className="basis-full grow flex justify-between flex-row">
                    <div className="flex flex-row">
                        <div className="w-10 shrink"></div>
                    </div>
                    {isAuthenticated ? (
                        <UserMenu />
                    ) : (
                        !isRegisterPage && (
                            <div className="flex flex-row gap-5 items-center mt-0 ps-5">
                                <Button variant="link" className="px-0" onClick={onClickLogin}>
                                    {t('header.login')}
                                </Button>
                                <Button onClick={onClickRegister}>{t('header.register')}</Button>
                            </div>
                        )
                    )}
                </div>
            </nav>
        </header>
    );
}

export default Header;
