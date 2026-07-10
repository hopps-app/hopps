import { DoubleArrowLeftIcon, DoubleArrowRightIcon, PersonIcon } from '@radix-ui/react-icons';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { menuConfig } from './shared/menu-config';
import type { MenuItem } from './shared/types';

import AdminBadge from '@/components/ui/AdminBadge';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import Icon from '@/components/ui/Icon';
import authService from '@/services/auth/auth.service';
import { useStore } from '@/store/store';

type DesktopSidebarProps = {
    collapsed: boolean;
    onToggle: () => void;
};

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ collapsed, onToggle }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { user, isAuthenticated } = useStore();

    const activeLang = i18n.language?.split('-')[0];

    const userMenuItems = React.useMemo<DropdownMenuItem[]>(
        () => [
            { type: 'label', title: t('language.label') },
            {
                title: t('language.de'),
                onClick: () => i18n.changeLanguage('de'),
                // Spacer keeps the label aligned with the checked row when inactive.
                icon: activeLang === 'de' ? <Icon icon="Check" /> : <span className="inline-block w-[15px]" />,
            },
            {
                title: t('language.en'),
                onClick: () => i18n.changeLanguage('en'),
                icon: activeLang === 'en' ? <Icon icon="Check" /> : <span className="inline-block w-[15px]" />,
            },
            { type: 'separator' },
            { title: t('menu.logout'), onClick: () => authService.logout().catch((e) => console.error('Failed to logout:', e)), icon: <Icon icon="Exit" /> },
        ],
        [t, i18n, activeLang]
    );

    const isItemActive = (path: string) => {
        const cleanPath = path.split('?')[0];
        return location.pathname === cleanPath || location.pathname.startsWith(cleanPath + '/');
    };

    const renderNavItem = (item: MenuItem) => {
        const active = isItemActive(item.path);
        const LucideIcon = item.lucideIcon;

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
                    {LucideIcon ? <LucideIcon size={18} /> : <Icon icon={item.icon} size={18} />}
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
                                className="z-50 rounded-md bg-grey-black px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
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
                {/* Brand: hopps [admin] */}
                <div className={`flex items-center h-16 flex-shrink-0 overflow-hidden ${collapsed ? 'justify-center px-2' : 'px-4 gap-2'}`}>
                    <img src="/logo.svg" alt="hopps logo" className="w-8 h-8 flex-shrink-0" />
                    {!collapsed && (
                        <>
                            <span className="text-primary font-bold text-xl tracking-tight whitespace-nowrap">hopps</span>
                            <AdminBadge className="ml-12" />
                        </>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                    {menuConfig.length > 0
                        ? menuConfig.map(renderNavItem)
                        : !collapsed && <p className="px-3 py-2 text-xs text-grey-700 dark:text-grey-600">{t('menu.empty')}</p>}
                </nav>

                <div className="flex-shrink-0 px-2 pb-3 space-y-1">
                    <div className="border-t border-separator my-2" />

                    {/* Current user -> logout */}
                    {isAuthenticated && (
                        <DropdownMenu items={userMenuItems} className="w-52" side="top" align="start">
                            <button
                                type="button"
                                aria-label={t('menu.userMenu')}
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
                                            {user?.name ?? t('menu.userFallback')}
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
