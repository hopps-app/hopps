import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTrigger } from '@radix-ui/react-dialog';

import Icon from '@/components/ui/Icon';
import { menuConfig, MenuItem } from './menu-config';

const SIDEBAR_WIDTH = 'w-32';
const ROUNDED = 'rounded-[20px]';

const SidebarNavigation: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [open, setOpen] = React.useState(false);
    const [expanded, setExpanded] = React.useState<string | null>(null);

    // Expand parent if current route matches a submenu
    React.useEffect(() => {
        const match = menuConfig.find((item) => item.children?.some((child) => location.pathname.startsWith(child.path ?? '')));
        if (match) setExpanded(match.id);
    }, [location.pathname]);

    const handleMenuClick = (item: MenuItem) => {
        if (item.children) {
            setExpanded(expanded === item.id ? null : item.id);
        } else if (item.path) {
            navigate(item.path);
            setOpen(false);
        }
    };

    const renderMenuItem = (item: MenuItem, isSub = false) => {
        const isActive = item.path && location.pathname.startsWith(item.path) && (!item.children || expanded === item.id);
        return (
            <li
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className={`
              flex flex-col items-center justify-center gap-1 py-3 cursor-pointer select-none ${ROUNDED} font-semibold text-xl'
          ${isActive ? 'bg-purple-200 text-black' : 'hover:bg-violet-50 text-gray-500'}
          ${isSub ? 'pl-6' : ''}
          transition-all duration-200
        `}
            >
                <Icon icon={item.icon} size={isSub ? 18 : 22} />
                <span className="text-xs leading-tight mt-1">{item.label}</span>
            </li>
        );
    };

    // Desktop sidebar with sliding submenu
    const sidebar = (
        <div className="hidden sm:flex relative">
            <aside className={`flex flex-col h-full ${SIDEBAR_WIDTH} border-r border-violet-200 bg-white ${ROUNDED}`}>
                <div className="flex flex-col items-center py-6">
                    <img src="/logo.svg" alt="hopps logo" className="w-14 h-14 mb-2" />
                    <span className="text-primary font-bold text-3xl mb-2">hopps</span>
                </div>
                <nav className="flex-1 flex flex-col gap-2 mt-2">
                    {menuConfig.map((item) => (
                        <div key={item.id}>
                            <ul className="bg-white">{renderMenuItem(item)}</ul>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Sliding submenu panel */}
            {expanded && (
                <div className={`absolute ${ROUNDED} left-full top-0 h-full bg-violet-50 border-r border-violet-200 shadow-lg animate-slide-in-right`}>
                    <div className="p-4">
                        <h3 className="text-sm font-semibold text-violet-700 mb-4 px-2">{menuConfig.find((item) => item.id === expanded)?.label}</h3>
                        <ul className="space-y-1">{menuConfig.find((item) => item.id === expanded)?.children?.map((child) => renderMenuItem(child, true))}</ul>
                    </div>
                </div>
            )}
        </div>
    );

    // Mobile drawer using Dialog
    const mobileSidebar = (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="sm:hidden fixed top-4 left-4 z-50 bg-white rounded-full shadow p-2 border border-violet-200">
                    <Icon icon="HamburgerMenu" size={24} />
                </button>
            </DialogTrigger>
            <DialogContent className="fixed inset-0 z-40 flex p-0 bg-transparent border-none" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div className={`${SIDEBAR_WIDTH} bg-white h-full shadow-xl animate-slide-in-left`}>
                    <div className="flex flex-col items-center py-6">
                        <img src="/logo.svg" alt="hopps logo" className="w-14 h-14 mb-2" />
                        <span className="text-violet-700 font-bold text-lg mb-2">hopps</span>
                    </div>
                    <nav className="flex-1 flex flex-col gap-2 mt-2">
                        {menuConfig.map((item) => (
                            <div key={item.id}>
                                <ul className="bg-white">{renderMenuItem(item)}</ul>
                                {item.children && expanded === item.id && (
                                    <div className="ml-2 border-l-2 border-violet-100">
                                        <ul className="bg-violet-50 pl-2">{item.children.map((child) => renderMenuItem(child, true))}</ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </nav>
                </div>
                <div className="flex-1" onClick={() => setOpen(false)} />
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
