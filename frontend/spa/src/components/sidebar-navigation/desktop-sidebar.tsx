import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Icon from '@/components/ui/Icon';
import { menuConfig } from './shared/menu-config';
import type { MenuItem, SubMenuItem } from './shared/types';

const ROUNDED_R = 'rounded-r-[20px]';
const ROUNDED = 'rounded-[20px]';

type DesktopSidebarProps = {
    closeDelayMs?: number;
};

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ closeDelayMs = 1000 }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [expanded, setExpanded] = React.useState<string | null>(null);
    const [isClosing, setIsClosing] = React.useState(false);
    const closeTimeoutId = React.useRef<number | null>(null);

    React.useEffect(() => {
        const match = menuConfig.find((item) => item.children?.some((child) => location.pathname.startsWith(child.path ?? '')));
        if (match) setExpanded(match.id);
    }, [location.pathname]);

    const handleMenuClick = (item: MenuItem | SubMenuItem) => {
        if (item.children) {
            if (expanded === item.id) {
                setIsClosing(true);
                setTimeout(() => {
                    setExpanded(null);
                    setIsClosing(false);
                }, 280);
            } else {
                setExpanded(item.id);
            }
        } else if (item.path) {
            setExpanded(null);
            navigate(item.path);
        }
    };

    const handleMenuHover = (item: MenuItem) => {
        if (item.children) {
            if (expanded !== item.id) {
                setExpanded(item.id);
            }
        } else if (expanded) {
            setIsClosing(true);
            setTimeout(() => {
                setExpanded(null);
                setIsClosing(false);
            }, 280);
        }
    };

    const cancelPendingClose = () => {
        if (closeTimeoutId.current !== null) {
            clearTimeout(closeTimeoutId.current);
            closeTimeoutId.current = null;
        }
    };

    const scheduleClose = () => {
        if (!expanded) return;
        cancelPendingClose();
        closeTimeoutId.current = window.setTimeout(() => {
            setIsClosing(true);
            setTimeout(() => {
                setExpanded(null);
                setIsClosing(false);
            }, 280);
        }, closeDelayMs);
    };

    React.useEffect(() => {
        return () => {
            cancelPendingClose();
        };
    }, []);

    const renderMenuItem = (item: MenuItem) => {
        const isActive = location.pathname.indexOf(item.path) > -1;
        return (
            <li
                key={item.id}
                onClick={() => handleMenuClick(item)}
                onMouseEnter={() => handleMenuHover(item)}
                className={`
              flex flex-col items-center justify-center text-center gap-1 p-4 ${item.id !== 'admin' ? 'mb-12' : ''} cursor-pointer select-none ${ROUNDED} font-semibold text-xl transition-all duration-200'
          ${isActive ? 'bg-purple-200 dark:bg-accent text-black' : 'hover:bg-violet-50 dark:hover:bg-purple-50 text-gray-500 dark:text-gray-200'}
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
              flex flex-col items-left justify-center gap-1 py-3 cursor-pointer select-none ${ROUNDED_R} hover:bg-violet-50 dark:hover:bg-purple-50 font-semibold text-xl pl-6 transition-all duration-200'
          ${isActive ? 'font-bold text-black' : 'dark:text-grey-400'}
        `}
            >
                <span className="text-xs leading-tight mt-1">{t(item.label)}</span>
            </li>
        );
    };

    return (
        <div className="flex fixed z-10 left-0 top-0 h-screen" onMouseLeave={scheduleClose} onMouseEnter={cancelPendingClose}>
            <aside className={`flex flex-col h-full w-28 z-10 border-r border-violet-200 bg-background-secondary dark:border-separator ${ROUNDED_R}`}>
                <div className="flex flex-col items-center py-6">
                    <img src="/logo.svg" alt="hopps logo" className="w-11 h-11 mb-2" />
                    <span className="text-primary font-bold text-2xl mb-2">hopps</span>
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
};

export default DesktopSidebar;
