import { Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';

import UserMenu from '@/layouts/default/UserMenu.tsx';
import SidebarNavigation from '@/components/sidebar-navigation';

export default function AuthLayout() {
    const { pathname } = useLocation();

    const isReceiptsAll = useMemo(() => pathname.includes('/receipts/all'), [pathname]);

    return (
        <div className="flex h-screen bg-background">
            <SidebarNavigation />
            <div className="flex-1 ml-0 sm:ml-28 flex">
                <div className="m-5 sm:m-6 flex-1">
                    <div className="flex justify-end py-4">
                        <UserMenu />
                    </div>

                    <main className="p-4 sm:p-6">
                        <div
                            className={`
                                ${!isReceiptsAll ? 'bg-background-secondary' : ''}
                                border
                                rounded-[30px]
                                min-h-[80vh]
                                w-full
                                `}
                        >
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
