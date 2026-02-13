import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import SidebarNavigation from '@/components/sidebar-navigation';
import UserMenu from '@/layouts/default/UserMenu.tsx';

const STORAGE_KEY = 'hopps-sidebar-collapsed';

export default function AuthLayout() {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

    const handleToggle = () => {
        setCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem(STORAGE_KEY, String(next));
            return next;
        });
    };

    return (
        <div className="flex h-screen bg-background">
            <SidebarNavigation collapsed={collapsed} onToggle={handleToggle} />
            <div className={`flex-1 ml-0 transition-[margin] duration-300 ease-in-out ${collapsed ? 'sm:ml-16' : 'sm:ml-60'}`}>
                <div className="m-2 sm:m-6 flex-1">
                    <div className="flex justify-end py-2 sm:py-4">
                        <UserMenu />
                    </div>

                    <main className="p-2 sm:p-6">
                        <ErrorBoundary key={location.pathname}>
                            <Outlet />
                        </ErrorBoundary>
                    </main>
                </div>
            </div>
        </div>
    );
}
