import { PlusIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import SidebarNavigation from '@/components/sidebar-navigation';
import Icon from '@/components/ui/Icon';
import { PageTitleProvider, usePageTitleValue } from '@/hooks/use-page-title';
import UserMenu from '@/layouts/default/UserMenu.tsx';

const STORAGE_KEY = 'hopps-sidebar-collapsed';

function PageHeader() {
    const { title, icon } = usePageTitleValue();
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-between py-2 sm:py-4 flex-shrink-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 truncate min-w-0">
                {icon && <Icon icon={icon} size={20} />}
                <span className="truncate">{title}</span>
            </h1>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <button
                    type="button"
                    onClick={() => navigate('/receipts/new')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-active transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                >
                    <PlusIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('menu.upload-receipt')}</span>
                </button>
                <UserMenu />
            </div>
        </div>
    );
}

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
            <div className="flex h-screen bg-background">
                <SidebarNavigation collapsed={collapsed} onToggle={handleToggle} />
                <div className={`flex-1 flex flex-col min-h-0 ml-0 transition-[margin] duration-300 ease-in-out ${collapsed ? 'sm:ml-16' : 'sm:ml-60'}`}>
                    <div className="m-2 sm:m-6 flex-1 flex flex-col min-h-0">
                        <PageHeader />

                        <main className="flex-1 min-h-0">
                            <ErrorBoundary key={location.pathname}>
                                <Outlet />
                            </ErrorBoundary>
                        </main>
                    </div>
                </div>
            </div>
        </PageTitleProvider>
    );
}
