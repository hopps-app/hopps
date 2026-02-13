import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@radix-ui/react-dialog';
import { PlusIcon } from '@radix-ui/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { menuConfig } from './shared/menu-config';
import type { MenuItem } from './shared/types';

import Icon from '@/components/ui/Icon';

const MobileSidebar: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);

    const isItemActive = (path: string) => {
        const cleanPath = path.split('?')[0];
        return location.pathname === cleanPath || location.pathname.startsWith(cleanPath + '/');
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        setIsOpen(false);
    };

    const mainItems = menuConfig.filter((item) => !item.isAdmin);
    const adminItems = menuConfig.filter((item) => item.isAdmin);

    const renderNavItem = (item: MenuItem) => {
        const active = isItemActive(item.path);

        return (
            <div key={item.id}>
                <button
                    type="button"
                    onClick={() => handleNavigation(item.path)}
                    className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-colors duration-150
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
                        ${active ? 'bg-purple-100 dark:bg-purple-300 text-primary' : 'text-grey-900 dark:text-grey-800 hover:bg-hover-effect dark:hover:bg-purple-200'}
                    `}
                >
                    <span className="flex-shrink-0">
                        <Icon icon={item.icon} size={18} />
                    </span>
                    <span className="flex-1 text-left">{t(item.label)}</span>
                </button>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    className="fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-lg bg-background-secondary shadow-md border border-separator focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={t('menu.openMenu')}
                >
                    <Icon icon="HamburgerMenu" size={20} />
                </button>
            </DialogTrigger>
            <DialogContent className="fixed inset-0 z-40 flex p-0 bg-transparent border-none">
                <DialogTitle className="sr-only">{t('menu.navigation')}</DialogTitle>

                <div className="relative w-[85vw] max-w-[280px] h-full bg-background-secondary shadow-xl flex flex-col animate-in slide-in-from-left duration-300">
                    <div className="flex items-center justify-between h-16 px-4 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <img src="/logo.svg" alt="hopps logo" className="w-8 h-8" />
                            <span className="text-primary font-bold text-xl tracking-tight">hopps</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-hover-effect dark:hover:bg-purple-200 transition-colors"
                            aria-label={t('common.close')}
                        >
                            <Icon icon="Cross1" size={16} />
                        </button>
                    </div>

                    <div className="px-2 mb-2">
                        <button
                            type="button"
                            onClick={() => handleNavigation('/receipts/new')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-active transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                        >
                            <PlusIcon className="w-5 h-5 flex-shrink-0" />
                            <span>{t('menu.upload-receipt')}</span>
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">{mainItems.map(renderNavItem)}</nav>

                    <div className="flex-shrink-0 px-2 pb-4 space-y-1">
                        <div className="border-t border-separator mb-2" />
                        <div className="px-3 pb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-grey-700 dark:text-grey-600">
                                {t('menu.admin')}
                            </span>
                        </div>
                        {adminItems.map(renderNavItem)}
                    </div>
                </div>

                <div className="flex-1 bg-black/40 animate-in fade-in duration-300" onClick={() => setIsOpen(false)} />
            </DialogContent>
        </Dialog>
    );
};

export default MobileSidebar;
