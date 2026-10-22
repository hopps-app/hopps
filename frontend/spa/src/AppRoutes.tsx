import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { KontenSkeleton } from '@/components/BankAccounts/KontenSkeleton';
import { CategoryGroupsSkeleton } from '@/components/CategoryGroups/CategoryGroupsSkeleton';
import { LoadingState } from '@/components/common/LoadingState';
import { DashboardSkeleton } from '@/components/Dashboard/DashboardSkeleton';
import { OrganizationDetailsSkeleton } from '@/components/Organization/OrganizationDetailsSkeleton';
import { ProfileSkeleton } from '@/components/Profile/ProfileSkeleton';
import { ReceiptsSkeleton } from '@/components/Receipts/ReceiptsSkeleton';
import { ReportsSkeleton } from '@/components/Reports/ReportsSkeleton';
import { TransactionsSkeleton } from '@/components/Transactions/TransactionsSkeleton';
import HomeView from '@/components/views/HomeView';
import NotFoundView from '@/components/views/NotFoundView';
import AuthGuard from '@/guards/AuthGuard';
import SetupGuard from '@/guards/SetupGuard';
import AuthLayout from '@/layouts/default/AuthLayout';
import DefaultLayout from '@/layouts/default/DefaultLayout.tsx';

// Eagerly loaded - these are needed immediately

// Lazy loaded - these are loaded on demand
const RegisterOrganizationView = lazy(() =>
    import('@/components/views/RegisterOrganizationView').then((module) => ({ default: module.RegisterOrganizationView }))
);
const DashboardView = lazy(() => import('@/components/views/DashboardView'));
const OrganizationSettingsView = lazy(() => import('./components/views/OrganizationSettings').then((module) => ({ default: module.OrganizationSettingsView })));
const ProfileSettingsView = lazy(() => import('./components/views/ProfileSettingsView'));
const CategoryGroupsView = lazy(() => import('./components/views/CategoryGroupsView'));
const OrganizationDetailsSettingsView = lazy(() => import('./components/views/OrganizationDetailsSettingsView'));
const ReceiptView = lazy(() => import('@/components/views/ReceiptView'));
const DebugErrorView = lazy(() => import('@/components/views/DebugErrorView'));
const KontenView = lazy(() => import('@/components/views/KontenView').then((m) => ({ default: m.KontenView })));
const TransactionenView = lazy(() => import('@/components/views/TransactionenView').then((m) => ({ default: m.TransactionenView })));
const ReportsView = lazy(() => import('@/components/views/ReportsView').then((m) => ({ default: m.ReportsView })));
const BankSchemasView = lazy(() => import('@/components/views/BankSchemasView').then((m) => ({ default: m.BankSchemasView })));
const LegalView = lazy(() => import('@/components/views/LegalView').then((m) => ({ default: m.LegalView })));

function LazyRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
    return <Suspense fallback={fallback ?? <LoadingState className="py-12" />}>{children}</Suspense>;
}

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<HomeView />} />
            <Route element={<DefaultLayout />}>
                {/* Sign-up on the hosted SaaS; the one-time initial setup on a single-tenant installation */}
                <Route
                    path="/register"
                    element={
                        <SetupGuard>
                            <LazyRoute>
                                <RegisterOrganizationView />
                            </LazyRoute>
                        </SetupGuard>
                    }
                />
            </Route>

            {/* Public legal pages (Impressum / Datenschutzerklärung) — operator-configurable */}
            <Route
                path="/impressum"
                element={
                    <LazyRoute>
                        <LegalView page="imprint" titleKey="legal.imprint" />
                    </LazyRoute>
                }
            />
            <Route
                path="/datenschutz"
                element={
                    <LazyRoute>
                        <LegalView page="privacy" titleKey="legal.privacy" />
                    </LazyRoute>
                }
            />

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
                        <LazyRoute fallback={<ProfileSkeleton />}>
                            <ProfileSettingsView />
                        </LazyRoute>
                    }
                />

                <Route
                    path="/dashboard/*"
                    element={
                        <LazyRoute fallback={<DashboardSkeleton />}>
                            <DashboardView />
                        </LazyRoute>
                    }
                />
                <Route
                    path="/structure"
                    element={
                        <LazyRoute>
                            <OrganizationSettingsView />
                        </LazyRoute>
                    }
                />

                {/* receipts/invoices */}
                <Route
                    path="/receipts"
                    element={
                        <LazyRoute fallback={<ReceiptsSkeleton />}>
                            <ReceiptView />
                        </LazyRoute>
                    }
                />

                {/* transactions */}
                <Route
                    path="/transactions"
                    element={
                        <LazyRoute fallback={<TransactionsSkeleton />}>
                            <TransactionenView />
                        </LazyRoute>
                    }
                />

                {/* reports */}
                <Route
                    path="/reports"
                    element={
                        <LazyRoute fallback={<ReportsSkeleton />}>
                            <ReportsView />
                        </LazyRoute>
                    }
                />

                {/* bank accounts */}
                <Route
                    path="/bank-accounts"
                    element={
                        <LazyRoute fallback={<KontenSkeleton />}>
                            <KontenView />
                        </LazyRoute>
                    }
                />
                <Route
                    path="/bank-schemas"
                    element={
                        <LazyRoute>
                            <BankSchemasView />
                        </LazyRoute>
                    }
                />

                {/* admin settings */}
                <Route
                    path="/admin/ngo-details"
                    element={
                        <LazyRoute fallback={<OrganizationDetailsSkeleton />}>
                            <OrganizationDetailsSettingsView />
                        </LazyRoute>
                    }
                />
                <Route
                    path="/admin/categories"
                    element={
                        <LazyRoute fallback={<CategoryGroupsSkeleton />}>
                            <CategoryGroupsView />
                        </LazyRoute>
                    }
                />

                {/* Debug route for testing error boundary (dev only) */}
                {import.meta.env.DEV && (
                    <Route
                        path="/debug/error"
                        element={
                            <LazyRoute>
                                <DebugErrorView />
                            </LazyRoute>
                        }
                    />
                )}

                <Route path="*" element={<NotFoundView />} />
            </Route>
            <Route path="*" element={<NotFoundView />} />
        </Routes>
    );
}
