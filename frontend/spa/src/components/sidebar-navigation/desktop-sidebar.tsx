import { DoubleArrowLeftIcon, DoubleArrowRightIcon, PersonIcon } from '@radix-ui/react-icons';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { menuConfig } from './shared/menu-config';
import type { MenuItem } from './shared/types';

import AlphaBadge from '@/components/ui/AlphaBadge';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu.tsx';
import Icon from '@/components/ui/Icon';
import authService from '@/services/auth/auth.service.ts';
import { useStore } from '@/store/store.ts';

type DesktopSidebarProps = {
    collapsed: boolean;
    onToggle: () => void;
};

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ collapsed, onToggle }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, isAuthenticated } = useStore();

    const userMenuItems = React.useMemo<DropdownMenuItem[]>(
        () => [
            { title: t('settings.menu.profile'), onClick: () => navigate('/profile'), icon: <Icon icon="Avatar" /> },
            { title: t('header.logout'), onClick: () => authService.logout().catch((e) => console.error('Failed to logout:', e)), icon: <Icon icon="Exit" /> },
        ],
        [t, navigate]
    );

    const isItemActive = (path: string) => {
        const cleanPath = path.split('?')[0];
        return location.pathname === cleanPath || location.pathname.startsWith(cleanPath + '/');
    };

    const mainItems = menuConfig.filter((item) => !item.isAdmin);
    const adminItems = menuConfig.filter((item) => item.isAdmin);

    const renderNavItem = (item: MenuItem) => {
        const active = isItemActive(item.path);

        const button = (
            <button
                type="button"
                onClick={() => navigate(item.path)}
                className={`
                    w-full flex items-center gap-3 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
                    ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'}
                    ${active ? 'bg-purple-100 dark:bg-purple-300 text-primary' : 'text-grey-900 dark:text-grey-800 hover:bg-hover-effect dark:hover:bg-purple-200'}
                `}
            >
                <span className="flex-shrink-0">
                    <Icon icon={item.icon} size={18} />
                </span>
                {!collapsed && <span className="flex-1 text-left truncate">{t(item.label)}</span>}
            </button>
        );

        return (
            <div key={item.id}>
                {collapsed ? (
                    <Tooltip.Root>
                        <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
                        <Tooltip.Portal>
                            <Tooltip.Content
                                side="right"
                                sideOffset={8}
                                className="z-50 rounded-md bg-grey-black px-2.5 py-1.5 text-xs font-medium text-white shadow-lg animate-in fade-in-0 zoom-in-95"
                            >
                                {t(item.label)}
                                <Tooltip.Arrow className="fill-grey-black" />
                            </Tooltip.Content>
                        </Tooltip.Portal>
                    </Tooltip.Root>
                ) : (
                    button
                )}
            </div>
        );
    };

    return (
        <Tooltip.Provider delayDuration={0}>
            <aside
                className={`
                    fixed left-0 top-0 h-screen z-10 flex flex-col
                    bg-background-secondary
                    border-r border-separator
                    transition-[width] duration-300 ease-in-out
                    ${collapsed ? 'w-16' : 'w-60'}
                `}
            >
                <div className={`flex items-center h-16 flex-shrink-0 overflow-hidden ${collapsed ? 'justify-center px-2' : 'px-4 gap-3'}`}>
                    <img src="/logo.svg" alt="hopps logo" className="w-8 h-8 flex-shrink-0" />
                    {collapsed ? (
                        <AlphaBadge collapsed />
                    ) : (
                        <>
                            <span className="text-primary font-bold text-xl tracking-tight whitespace-nowrap transition-all duration-300 opacity-100">
                                hopps
                            </span>
                            <AlphaBadge />
                        </>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">{mainItems.map(renderNavItem)}</nav>

                <div className="flex-shrink-0 px-2 pb-3 space-y-1">
                    <div className="border-t border-separator mb-2" />
                    {!collapsed && (
                        <div className="px-3 pb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-grey-700 dark:text-grey-600">{t('menu.admin')}</span>
                        </div>
                    )}
                    {adminItems.map(renderNavItem)}

                    <div className="border-t border-separator my-2" />

                    {/* User profile */}
                    {isAuthenticated && (
                        <DropdownMenu items={userMenuItems} className="w-52">
                            <button
                                type="button"
                                className={`w-full flex items-center gap-2.5 rounded-[10px] transition-colors hover:bg-hover-effect dark:hover:bg-purple-200 ${collapsed ? 'justify-center p-2' : 'px-2 py-2'}`}
                            >
                                <div
                                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                                    style={{ background: 'linear-gradient(135deg,#7E3FB4,#9955CC)' }}
                                >
                                    {user?.name ? user.name.charAt(0).toUpperCase() : <PersonIcon className="w-4 h-4" />}
                                </div>
                                {!collapsed && (
                                    <div className="flex flex-col min-w-0 text-left">
                                        <span className="text-[13px] font-semibold text-[#1B1B1F] dark:text-white truncate leading-tight">
                                            {user?.name ?? 'User'}
                                        </span>
                                        <span className="text-[11px] text-[#9A9AA3] truncate leading-tight">{user?.email ?? ''}</span>
                                    </div>
                                )}
                            </button>
                        </DropdownMenu>
                    )}

                    {/* Collapse toggle */}
                    <button
                        type="button"
                        onClick={onToggle}
                        aria-label={collapsed ? t('menu.expand') : t('menu.collapse')}
                        className={`
                            w-full flex items-center gap-3 rounded-lg text-sm
                            text-grey-800 dark:text-grey-700
                            hover:bg-hover-effect dark:hover:bg-purple-200
                            transition-colors duration-150
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
                            ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'}
                        `}
                    >
                        {collapsed ? (
                            <DoubleArrowRightIcon className="w-4 h-4" />
                        ) : (
                            <>
                                <DoubleArrowLeftIcon className="w-4 h-4" />
                                <span>{t('menu.collapse')}</span>
                            </>
                        )}
                    </button>
                </div>
            </aside>
        </Tooltip.Provider>
    );
};

export default DesktopSidebar;
