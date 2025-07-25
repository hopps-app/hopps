import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTrigger } from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';

import Icon from '@/components/ui/Icon';
import { menuConfig, MenuItem, SubMenuItem } from './menu-config';

const SIDEBAR_WIDTH = 'w-32';
const ROUNDED_R = 'rounded-r-[20px]';
const ROUNDED = 'rounded-[20px]';

const SidebarNavigation: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);
    const [expanded, setExpanded] = React.useState<string | null>(null);
    const [isClosing, setIsClosing] = React.useState(false);
    const [isWideScreen, setIsWideScreen] = React.useState(false);
    const [pinnedSubmenu, setPinnedSubmenu] = React.useState<string | null>(null);

    React.useEffect(() => {
        const checkScreenWidth = () => {
            setIsWideScreen(window.innerWidth > 1400);
        };

        checkScreenWidth();
        window.addEventListener('resize', checkScreenWidth);
    }, []);

    // Expand parent if current route matches a submenu
    React.useEffect(() => {
        const match = menuConfig.find((item) => item.children?.some((child) => location.pathname.startsWith(child.path ?? '')));
        if (match) setExpanded(match.id);
    }, [location.pathname]);

    const handleMenuClick = (item: MenuItem | SubMenuItem) => {
        if (item.children) {
            if (isWideScreen) {
                if (pinnedSubmenu === item.id) {
                    setPinnedSubmenu(null);
                } else {
                    setPinnedSubmenu(item.id);
                    setExpanded(item.id);
                }
            } else {
                if (expanded === item.id) {
                    setIsClosing(true);
                    setTimeout(() => {
                        setExpanded(null);
                        setIsClosing(false);
                    }, 280);
                } else {
                    setExpanded(item.id);
                }
            }
        } else if (item.path) {
            setPinnedSubmenu(null);
            setExpanded(null);
            navigate(item.path);
            handleMobileMenuClose();
        }
    };

    const handleMenuHover = (item: MenuItem) => {
        if (item.children) {
            if (expanded && expanded !== item.id) {
                setExpanded(item.id);
            } else if (!expanded) {
                setExpanded(item.id);
            }
        } else if (expanded && (!isWideScreen || !pinnedSubmenu)) {
            setIsClosing(true);
            setTimeout(() => {
                setExpanded(null);
                setIsClosing(false);
            }, 280);
        }
    };

    const handleSidebarLeave = () => {
        if (isWideScreen && pinnedSubmenu) {
            setExpanded(pinnedSubmenu);
            return;
        }

        if (expanded) {
            setIsClosing(true);
            setTimeout(() => {
                setExpanded(null);
                setIsClosing(false);
            }, 280);
        }
    };

    const handleMobileMenuClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsMobileOpen(false);
            setIsClosing(false);
        }, 280);
    };

    const renderMenuItem = (item: MenuItem) => {
        const isActive = location.pathname.indexOf(item.path) > -1;
        return (
            <li
                key={item.id}
                onClick={() => handleMenuClick(item)}
                onMouseEnter={() => handleMenuHover(item)}
                className={`
              flex flex-col items-center justify-center gap-1 p-4 ${item.id !== 'admin' ? 'mb-12' : ''} cursor-pointer select-none ${ROUNDED} font-semibold text-xl transition-all duration-200'
          ${isActive ? 'bg-purple-200 dark:bg-accent text-black' : 'hover:bg-violet-50 dark:hover:bg-accent text-gray-500 dark:text-gray-200'}
        `}
            >
                <Icon icon={item.icon} size={22} />
                <span className="text-xs leading-tight mt-1">{t(item.label)}</span>
            </li>
        );
    };

    const renderSubMenuItem = (item: SubMenuItem) => {
        const isActive = location.pathname.indexOf(item.path) > -1;
        return (
            <li
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className={`
              flex flex-col items-center justify-center gap-1 py-3 cursor-pointer select-none ${ROUNDED_R} font-semibold text-xl pl-6 transition-all duration-200'
          ${isActive ? 'font-bold text-black' : 'text-gray-500'}
        `}
            >
                <span className="text-xs leading-tight mt-1">{t(item.label)}</span>
            </li>
        );
    };

    const sidebar = (
        <div className="hidden sm:flex fixed left-0 top-0 h-screen" onMouseLeave={handleSidebarLeave}>
            <aside
                className={`flex flex-col h-full ${SIDEBAR_WIDTH} z-10 border-r border-violet-200 bg-background-secondary dark:border-separator ${ROUNDED_R}`}
            >
                <div className="flex flex-col items-center py-6">
                    <img src="/logo.svg" alt="hopps logo" className="w-14 h-14 mb-2" />
                    <span className="text-primary font-bold text-3xl mb-2">hopps</span>
                </div>
                <nav className="flex-1 flex flex-col gap-2 mt-2">
                    {menuConfig
                        .filter((item) => item.id !== 'admin')
                        .map((item) => (
                            <div key={item.id}>
                                <ul>{renderMenuItem(item)}</ul>
                            </div>
                        ))}
                </nav>
                <div className="mt-auto mb-4">
                    <ul>{renderMenuItem(menuConfig.find((item) => item.id === 'admin')!)}</ul>
                </div>
            </aside>

            {expanded && (
                <div
                    className={`absolute ${ROUNDED_R} z-0 left-[calc(100%-20px)] top-0 w-44 h-full bg-purple-100 dark:bg-purple-200 border-r border-violet-200 shadow-lg animate-in duration-300 slide-in-from-left ${isClosing ? 'animate-out slide-out-to-left' : ''}`}
                >
                    <div className="p-4 pt-40">
                        <ul className="space-y-1">{menuConfig.find((item) => item.id === expanded)?.children?.map((child) => renderSubMenuItem(child))}</ul>
                    </div>
                </div>
            )}
        </div>
    );

    const mobileSidebar = (
        <Dialog open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <DialogTrigger asChild>
                <button className="sm:hidden fixed top-4 left-4 z-50 bg-white rounded-full shadow p-2 border border-violet-200">
                    <Icon icon={isMobileOpen ? 'Cross1' : 'HamburgerMenu'} size={24} />
                </button>
            </DialogTrigger>
            <DialogContent className="fixed inset-0 z-40 flex p-0 bg-transparent border-none" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <div
                    className={`relative w-[55vw] max-w-xs h-full bg-background-secondary shadow-xl flex flex-col animate-in duration-300 slide-in-from-left ${isClosing ? 'animate-out slide-out-to-left' : ''}`}
                >
                    <button
                        className="absolute top-4 left-4 z-50 bg-white rounded-full shadow p-2 border border-violet-200"
                        onClick={handleMobileMenuClose}
                        aria-label="Close menu"
                    >
                        <Icon icon="Cross1" size={24} />
                    </button>
                    <div className="flex flex-col items-center py-8">
                        <img src="/logo.svg" alt="hopps logo" className="w-14 h-14 mb-2" />
                        <span className="text-primary font-bold text-3xl mb-2">hopps</span>
                    </div>
                    <nav className="flex-1 flex flex-col gap-2 mt-2">
                        {menuConfig
                            .filter((item) => item.id !== 'admin')
                            .map((item) => (
                                <div key={item.id}>
                                    <ul>{renderMenuItem(item)}</ul>
                                    {item.children && expanded === item.id && (
                                        <div className="ml-2 border-l-2 border-violet-100">
                                            <ul className="bg-violet-50 pl-2">{item.children.map((child) => renderSubMenuItem(child))}</ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                    </nav>
                    <div className="mt-auto mb-4">
                        <ul>{renderMenuItem(menuConfig.find((item) => item.id === 'admin')!)}</ul>
                    </div>
                </div>
                <div className="flex-1" onClick={handleMobileMenuClose} />
            </DialogContent>
        </Dialog>
    );

    return (
        <>
            {sidebar}
            {mobileSidebar}
        </>
    );
};

export default SidebarNavigation;
