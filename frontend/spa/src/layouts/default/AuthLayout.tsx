import { Outlet } from 'react-router-dom';

import UserMenu from '@/layouts/default/UserMenu.tsx';
import SidebarNavigation from '@/components/sidebar-navigation';

export default function AuthLayout() {
    return (
        <div className="flex h-screen bg-background">
            <SidebarNavigation />
            <div className="container mx-auto py-8">
                <header className="flex justify-end pb-5">
                    <UserMenu />
                </header>
                <main className="flex-1 flex flex-col">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
