import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import HomeView from '@/components/views/HomeView';
import AdminGuard from '@/guards/AdminGuard';
import AdminLayout from '@/layouts/AdminLayout';

const OrganizationsView = lazy(() => import('@/components/views/OrganizationsView'));

function LazyRoute({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={null}>{children}</Suspense>;
}

export default function AppRoutes() {
    return (
        <Routes>
            <Route
                element={
                    <AdminGuard>
                        <AdminLayout />
                    </AdminGuard>
                }
            >
                <Route path="/" element={<Navigate to="/organizations" replace />} />
                <Route
                    path="/organizations"
                    element={
                        <LazyRoute>
                            <OrganizationsView />
                        </LazyRoute>
                    }
                />
                {/* Unmatched paths fall through to HomeView rather than the org list,
                    so a typo'd URL is visible instead of silently landing somewhere real. */}
                <Route path="*" element={<HomeView />} />
            </Route>
        </Routes>
    );
}
