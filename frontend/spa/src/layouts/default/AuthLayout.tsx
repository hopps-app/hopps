import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import LegalFooter from '@/components/common/LegalFooter/LegalFooter';
import SidebarNavigation from '@/components/sidebar-navigation';
import { PageTitleProvider } from '@/hooks/PageTitleProvider';
import { useActivityHeartbeat } from '@/hooks/use-activity-heartbeat';

const STORAGE_KEY = 'hopps-sidebar-collapsed';

export default function AuthLayout() {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

    // Mounted here rather than per-route: this layout wraps every authenticated page, so presence is
    // reported for the whole session and survives navigation.
    useActivityHeartbeat();

    const handleToggle = () => {
        setCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem(STORAGE_KEY, String(next));
            return next;
        });
    };

    return (
        <PageTitleProvider>
            {/* Page background as a class, not an inline style, so it can follow the theme. */}
            <div className="flex h-screen bg-[#F3F4F6] dark:bg-[#131317]">
                <SidebarNavigation collapsed={collapsed} onToggle={handleToggle} />
                <div
                    className={`flex-1 flex flex-col min-h-0 min-w-0 ml-0 transition-[margin] duration-300 ease-in-out ${collapsed ? 'sm:ml-16' : 'sm:ml-60'}`}
                >
                    <main className="flex-1 min-h-0 overflow-auto">
                        <div className="flex min-h-full flex-col">
                            <div className="flex-1 p-4 sm:p-7">
                                <ErrorBoundary key={location.pathname}>
                                    <Outlet />
                                </ErrorBoundary>
                            </div>
                            <LegalFooter className="px-4" />
                        </div>
                    </main>
                </div>
            </div>
        </PageTitleProvider>
    );
}
