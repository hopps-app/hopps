import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@radix-ui/react-dialog';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from '@radix-ui/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { menuConfig } from './shared/menu-config';
import type { MenuItem, SubMenuItem } from './shared/types';

import Icon from '@/components/ui/Icon';

const MobileSidebar: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);
    const [expandedMenus, setExpandedMenus] = React.useState<Set<string>>(new Set());

    React.useEffect(() => {
        const match = menuConfig.find((item) => item.children?.some((child) => location.pathname.startsWith(child.path.split('?')[0])));
        if (match) {
            setExpandedMenus((prev) => new Set(prev).add(match.id));
        }
    }, [location.pathname]);

    const isItemActive = (path: string) => {
        const cleanPath = path.split('?')[0];
        return location.pathname === cleanPath || location.pathname.startsWith(cleanPath + '/');
    };

    const isParentActive = (item: MenuItem) => {
        if (isItemActive(item.path)) return true;
        return item.children?.some((child) => isItemActive(child.path)) ?? false;
    };

    const toggleSubmenu = (id: string) => {
        setExpandedMenus((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        setIsOpen(false);
    };

    const mainItems = menuConfig.filter((item) => item.id !== 'admin');
    const adminItem = menuConfig.find((item) => item.id === 'admin')!;

    const renderNavItem = (item: MenuItem) => {
        const active = isParentActive(item);
        const hasChildren = !!item.children?.length;
        const isExpanded = expandedMenus.has(item.id);

        return (
            <div key={item.id}>
                <button
                    type="button"
                    onClick={() => {
                        if (hasChildren) {
                            toggleSubmenu(item.id);
                        } else {
                            handleNavigation(item.path);
                        }
                    }}
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
                    {hasChildren && (
                        <span className="flex-shrink-0">
                            {isExpanded ? <ChevronDownIcon className="w-4 h-4 text-grey-700" /> : <ChevronRightIcon className="w-4 h-4 text-grey-700" />}
                        </span>
                    )}
                </button>

                {hasChildren && isExpanded && (
                    <div className="mt-1 ml-[21px] pl-3 border-l-2 border-purple-200 dark:border-purple-400 space-y-0.5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                        {item.children!.map((child) => renderSubItem(child))}
                    </div>
                )}
            </div>
        );
    };

    const renderSubItem = (item: SubMenuItem) => {
        const active = isItemActive(item.path);
        return (
            <button
                key={item.id}
                type="button"
                onClick={() => handleNavigation(item.path)}
                className={`
                    w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
                    ${active ? 'text-primary font-medium' : 'text-grey-800 dark:text-grey-700 hover:text-grey-900 dark:hover:text-grey-800'}
                `}
            >
                {t(item.label)}
            </button>
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
                        {renderNavItem(adminItem)}
                    </div>
                </div>

                <div className="flex-1 bg-black/40 animate-in fade-in duration-300" onClick={() => setIsOpen(false)} />
            </DialogContent>
        </Dialog>
    );
};

export default MobileSidebar;
