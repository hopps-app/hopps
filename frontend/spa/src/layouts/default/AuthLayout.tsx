import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import SidebarNavigation from '@/components/sidebar-navigation';
import { PageTitleProvider } from '@/hooks/PageTitleProvider';

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
        <PageTitleProvider>
            <div className="flex h-screen" style={{ background: '#F3F4F6' }}>
                <SidebarNavigation collapsed={collapsed} onToggle={handleToggle} />
                <div className={`flex-1 flex flex-col min-h-0 ml-0 transition-[margin] duration-300 ease-in-out ${collapsed ? 'sm:ml-16' : 'sm:ml-60'}`}>
                    <main className="flex-1 min-h-0 overflow-auto">
                        <div className="h-full p-4 sm:p-7">
                            <ErrorBoundary key={location.pathname}>
                                <Outlet />
                            </ErrorBoundary>
                        </div>
                    </main>
                </div>
            </div>
        </PageTitleProvider>
    );
}
