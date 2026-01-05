import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';

import Icon from '@/components/ui/Icon';
import { menuConfig } from './shared/menu-config';
import type { MenuItem, SubMenuItem } from './shared/types';

const ROUNDED = 'rounded-[20px]';

const MobileSidebar: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);
    const [mobileSubmenuStack, setMobileSubmenuStack] = React.useState<string[]>([]);
    const [isMobileFading, setIsMobileFading] = React.useState(false);
    const [isClosing, setIsClosing] = React.useState(false);

    const handleMobileMenuClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsMobileOpen(false);
            setIsClosing(false);
            setMobileSubmenuStack([]);
        }, 280);
    };

    const handleMobileSubmenuEnter = (menuId: string) => {
        setIsMobileFading(true);
        setTimeout(() => {
            setMobileSubmenuStack([...mobileSubmenuStack, menuId]);
            setIsMobileFading(false);
        }, 280);
    };

    const handleMobileSubmenuBack = () => {
        setIsMobileFading(true);
        setTimeout(() => {
            const newStack = [...mobileSubmenuStack];
            newStack.pop();
            setMobileSubmenuStack(newStack);
            setIsMobileFading(false);
        }, 280);
    };

    const handleMobileMenuClick = (item: MenuItem | SubMenuItem) => {
        if (item.children && mobileSubmenuStack.length === 0) {
            handleMobileSubmenuEnter(item.id);
        } else if (item.path) {
            navigate(item.path);
            handleMobileMenuClose();
        }
    };

    const renderMobileMenuItem = (item: MenuItem) => {
        const isActive = location.pathname.indexOf(item.path) > -1;
        return (
            <li
                key={item.id}
                onClick={() => handleMobileMenuClick(item)}
                className={`
              flex items-center justify-between gap-3 p-4 h-16 cursor-pointer select-none ${ROUNDED} font-semibold text-lg transition-all duration-200
          ${isActive ? 'bg-purple-200 dark:bg-accent text-black' : 'hover:bg-violet-50 dark:hover:bg-accent text-gray-500 dark:text-gray-200'}
        `}
            >
                <div className="flex items-center gap-3">
                    <Icon icon={item.icon} size={20} />
                    <span>{t(item.label)}</span>
                </div>
                {item.children && <Icon icon="ArrowRight" size={16} className="text-gray-400" />}
            </li>
        );
    };

    const renderMobileSubMenuItem = (item: SubMenuItem) => {
        const isActive = location.pathname.indexOf(item.path) > -1;
        return (
            <li
                key={item.id}
                onClick={() => handleMobileMenuClick(item)}
                className={`
              flex items-center gap-3 p-4 cursor-pointer select-none ${ROUNDED} font-medium text-base transition-all duration-200
          ${isActive ? 'bg-purple-200 dark:bg-accent text-black' : 'hover:bg-violet-50 dark:hover:bg-accent text-gray-500 dark:text-gray-200'}
        `}
            >
                <span>{t(item.label)}</span>
            </li>
        );
    };

    return (
        <Dialog open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <DialogTitle className="sr-only">Menu</DialogTitle>
            <DialogTrigger asChild>
                <button className="fixed top-4 left-4 z-50 bg-white rounded-full shadow p-2 border border-violet-200">
                    <Icon icon={isMobileOpen ? 'Cross1' : 'HamburgerMenu'} size={24} />
                </button>
            </DialogTrigger>
            <DialogContent className="fixed inset-0 z-40 flex p-0 bg-transparent border-none" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <div
                    className={`relative w-[90vw] max-w-xs h-full bg-background-secondary shadow-xl flex flex-col animate-in duration-300 slide-in-from-left ${isClosing ? 'animate-out slide-out-to-left' : ''}`}
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
                    <nav className={`flex-1 flex flex-col gap-3 mt-2 duration-300 ${isMobileFading ? 'opacity-0' : 'opacity-100'}`}>
                        {mobileSubmenuStack.length === 0 ? (
                            <>
                                {menuConfig
                                    .filter((item) => item.id !== 'admin')
                                    .map((item) => (
                                        <ul key={item.id}>{renderMobileMenuItem(item)}</ul>
                                    ))}
                            </>
                        ) : (
                            <>
                                <ul>
                                    <li
                                        onClick={handleMobileSubmenuBack}
                                        className="flex items-center justify-between gap-3 p-4 cursor-pointer select-none rounded-[20px] font-semibold text-lg transition-all duration-200 hover:bg-violet-50 dark:hover:bg-accent text-gray-500 dark:text-gray-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon icon="ArrowLeft" size={20} />
                                            <span>{t('Main Menu')}</span>
                                        </div>
                                    </li>
                                </ul>

                                {(() => {
                                    const currentMenuId = mobileSubmenuStack[mobileSubmenuStack.length - 1];
                                    const currentMenu = menuConfig.find((item) => item.id === currentMenuId);
                                    return currentMenu?.children?.map((child) => <ul key={child.id}>{renderMobileSubMenuItem(child)}</ul>);
                                })()}
                            </>
                        )}
                    </nav>

                    {mobileSubmenuStack.length === 0 && (
                        <div className={`mt-auto mb-4 duration-300 ${isMobileFading ? 'opacity-0' : 'opacity-100'}`}>
                            <ul>{renderMobileMenuItem(menuConfig.find((item) => item.id === 'admin')!)}</ul>
                        </div>
                    )}
                </div>
                <div className="flex-1" onClick={handleMobileMenuClose} />
            </DialogContent>
        </Dialog>
    );
};

export default MobileSidebar;
