import { Outlet } from 'react-router-dom';

import SidebarNavigation from './sidebar-navigation';

export default function AuthLayout() {
    return (
        <div className="flex h-screen w-screen bg-violet-50">
            <SidebarNavigation />
            <main className="flex-1 flex flex-col p-8">
                <Outlet />
            </main>
        </div>
    );
}
