import { ChevronDownIcon, ChevronRightIcon, DoubleArrowLeftIcon, DoubleArrowRightIcon, PlusIcon } from '@radix-ui/react-icons';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { menuConfig } from './shared/menu-config';
import type { MenuItem, SubMenuItem } from './shared/types';

import Icon from '@/components/ui/Icon';

type DesktopSidebarProps = {
    collapsed: boolean;
    onToggle: () => void;
};

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ collapsed, onToggle }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
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

    const mainItems = menuConfig.filter((item) => item.id !== 'admin');
    const adminItem = menuConfig.find((item) => item.id === 'admin')!;

    const renderNavItem = (item: MenuItem) => {
        const active = isParentActive(item);
        const hasChildren = !!item.children?.length;
        const isExpanded = expandedMenus.has(item.id);

        const button = (
            <button
                type="button"
                onClick={() => {
                    if (hasChildren && !collapsed) {
                        toggleSubmenu(item.id);
                    } else {
                        navigate(item.path);
                    }
                }}
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
                {!collapsed && (
                    <>
                        <span className="flex-1 text-left truncate">{t(item.label)}</span>
                        {hasChildren && (
                            <span className="flex-shrink-0">
                                {isExpanded ? <ChevronDownIcon className="w-4 h-4 text-grey-700" /> : <ChevronRightIcon className="w-4 h-4 text-grey-700" />}
                            </span>
                        )}
                    </>
                )}
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

                {hasChildren && isExpanded && !collapsed && (
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
                onClick={() => navigate(item.path)}
                className={`
                    w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
                    ${active ? 'text-primary font-medium' : 'text-grey-800 dark:text-grey-700 hover:text-grey-900 dark:hover:text-grey-800'}
                `}
            >
                {t(item.label)}
            </button>
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
                    <span
                        className={`text-primary font-bold text-xl tracking-tight whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'opacity-100'}`}
                    >
                        hopps
                    </span>
                </div>

                <div className="px-2 mb-2">
                    {collapsed ? (
                        <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                                <button
                                    type="button"
                                    onClick={() => navigate('/receipts/new')}
                                    className="w-full flex items-center justify-center p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-active transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                                <Tooltip.Content
                                    side="right"
                                    sideOffset={8}
                                    className="z-50 rounded-md bg-grey-black px-2.5 py-1.5 text-xs font-medium text-white shadow-lg animate-in fade-in-0 zoom-in-95"
                                >
                                    {t('menu.upload-receipt')}
                                    <Tooltip.Arrow className="fill-grey-black" />
                                </Tooltip.Content>
                            </Tooltip.Portal>
                        </Tooltip.Root>
                    ) : (
                        <button
                            type="button"
                            onClick={() => navigate('/receipts/new')}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-active transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                        >
                            <PlusIcon className="w-5 h-5 flex-shrink-0" />
                            <span>{t('menu.upload-receipt')}</span>
                        </button>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">{mainItems.map(renderNavItem)}</nav>

                <div className="flex-shrink-0 px-2 pb-3 space-y-1">
                    <div className="border-t border-separator mb-2" />
                    {renderNavItem(adminItem)}
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
