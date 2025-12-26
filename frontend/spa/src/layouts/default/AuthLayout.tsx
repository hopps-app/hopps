import { Outlet } from 'react-router-dom';

import UserMenu from '@/layouts/default/UserMenu';
import SidebarNavigation from '@/components/sidebar-navigation';

export default function AuthLayout() {
    return (
        <div className="flex h-screen bg-background">
            <SidebarNavigation />

            <div className="flex-1 sm:ml-28 flex flex-col px-7">
                {/* Top bar */}
                <div className="flex justify-end py-3">
                    <UserMenu />
                </div>

                {/* Main content */}
                <main className="flex-1 p-4 sm:p-6">
                    <div className="h-[80vh] w-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
