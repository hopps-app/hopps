import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import SidebarNavigation from '@/components/sidebar-navigation';

const STORAGE_KEY = 'hopps-admin-sidebar-collapsed';

export default function AdminLayout() {
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
            <div className={`flex-1 flex flex-col min-h-0 transition-[margin] duration-300 ease-in-out ${collapsed ? 'ml-16' : 'ml-60'}`}>
                <main className="flex-1 min-h-0 overflow-auto">
                    <div className="h-full p-4 sm:p-7">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
