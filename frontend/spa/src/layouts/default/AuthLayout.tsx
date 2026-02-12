import { Outlet, useLocation } from 'react-router-dom';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import SidebarNavigation from '@/components/sidebar-navigation';
import UserMenu from '@/layouts/default/UserMenu.tsx';

export default function AuthLayout() {
    const location = useLocation();

    return (
        <div className="flex h-screen bg-background">
            <SidebarNavigation />
            <div className="flex-1 ml-0 sm:ml-28 flex">
                <div className="m-5 sm:m-6 flex-1">
                    <div className="flex justify-end py-4">
                        <UserMenu />
                    </div>

                    <main className="p-4 sm:p-6">
                        <ErrorBoundary key={location.pathname}>
                            <Outlet />
                        </ErrorBoundary>
                    </main>
                </div>
            </div>
        </div>
    );
}
