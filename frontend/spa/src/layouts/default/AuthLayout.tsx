import { Outlet } from 'react-router-dom';

import SidebarNavigation from './sidebar-navigation';
import UserMenu from '@/layouts/default/UserMenu.tsx';

export default function AuthLayout() {
    return (
        <div className="flex h-screen w-screen bg-violet-50">
            <SidebarNavigation />
            <div className="container mx-auto py-8">
                <header className="flex justify-end">
                    <UserMenu />
                </header>
                <main className="flex-1 flex flex-col">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
