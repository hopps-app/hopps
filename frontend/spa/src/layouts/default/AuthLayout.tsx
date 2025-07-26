import { Outlet } from 'react-router-dom';

import UserMenu from '@/layouts/default/UserMenu.tsx';
import SidebarNavigation from '@/components/sidebar-navigation';

export default function AuthLayout() {
    return (
        <div className="flex h-screen bg-background">
            <SidebarNavigation />
            {/*the desktop-sidebar component has w-28 */}
            <div className={`flex-1 flex justify-center ml-0 sm:ml-28`}>
                <div className="w-full max-w-[1360px] px-4 py-8">
                    <header className="flex justify-end pb-5">
                        <UserMenu />
                    </header>
                    <main className="flex-1 flex flex-col">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}
