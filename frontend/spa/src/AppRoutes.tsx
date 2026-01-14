import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { LoadingState } from '@/components/common/LoadingState';
import AuthGuard from '@/guards/AuthGuard';
import AuthLayout from '@/layouts/default/AuthLayout';
import DefaultLayout from '@/layouts/default/DefaultLayout.tsx';

// Eagerly loaded - these are needed immediately
import HomeView from '@/components/views/HomeView';
import NotFoundView from '@/components/views/NotFoundView';

// Lazy loaded - these are loaded on demand
const DemoView = lazy(() => import('@/components/views/DemoView'));
const RegisterOrganizationView = lazy(() =>
    import('@/components/views/RegisterOrganizationView').then((module) => ({ default: module.RegisterOrganizationView }))
);
const DashboardView = lazy(() => import('@/components/views/DashboardView'));
const SettingsView = lazy(() => import('@/components/views/SettingsView'));
const OrganizationSettingsView = lazy(() =>
    import('./components/views/OrganizationSettings').then((module) => ({ default: module.OrganizationSettingsView }))
);
const ReceiptUploadView = lazy(() =>
    import('./components/views/ReceiptUpload').then((module) => ({ default: module.ReceiptUploadView }))
);
const ProfileSettingsView = lazy(() => import('./components/views/ProfileSettingsView'));
const CategoriesSettingsView = lazy(() => import('./components/views/CategoriesSettingsView'));
const ReceiptView = lazy(() => import('@/components/views/ReceiptView'));

function LazyRoute({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={<LoadingState className="py-12" />}>{children}</Suspense>;
}

export default function AppRoutes() {
    return (
        <Routes>
            <Route element={<DefaultLayout />}>
                <Route path="/" element={<HomeView />} />
                <Route
                    path="/demo"
                    element={
                        <LazyRoute>
                            <DemoView />
                        </LazyRoute>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <LazyRoute>
                            <RegisterOrganizationView />
                        </LazyRoute>
                    }
                />
            </Route>

            <Route
                element={
                    <AuthGuard>
                        <AuthLayout />
                    </AuthGuard>
                }
            >
                {/* user menu */}
                <Route
                    path="/profile"
                    element={
                        <LazyRoute>
                            <ProfileSettingsView />
                        </LazyRoute>
                    }
                />

                <Route
                    path="/dashboard/*"
                    element={
                        <LazyRoute>
                            <DashboardView />
                        </LazyRoute>
                    }
                />
                <Route
                    path="/structure/*"
                    element={
                        <LazyRoute>
                            <OrganizationSettingsView />
                        </LazyRoute>
                    }
                />

                {/* receipts/invoices */}
                <Route
                    path="/receipts/new"
                    element={
                        <LazyRoute>
                            <ReceiptUploadView />
                        </LazyRoute>
                    }
                />
                <Route
                    path="/receipts"
                    element={
                        <LazyRoute>
                            <ReceiptView />
                        </LazyRoute>
                    }
                />

                {/* admin settings */}
                <Route
                    path="/admin/categories"
                    element={
                        <LazyRoute>
                            <CategoriesSettingsView />
                        </LazyRoute>
                    }
                />
                {/* Old navigation logic */}
                <Route
                    path="/settings/*"
                    element={
                        <LazyRoute>
                            <SettingsView />
                        </LazyRoute>
                    }
                />

                <Route path="*" element={<NotFoundView />} />
            </Route>
            <Route path="*" element={<NotFoundView />} />
        </Routes>
    );
}
