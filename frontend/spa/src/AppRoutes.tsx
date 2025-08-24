import { Route, Routes } from 'react-router-dom';

import AuthGuard from '@/guards/AuthGuard';
import HomeView from '@/components/views/HomeView';
import DemoView from '@/components/views/DemoView';
import { RegisterOrganizationView } from '@/components/views/RegisterOrganizationView';
import DashboardView from '@/components/views/DashboardView';
import SettingsView from '@/components/views/SettingsView';
import NotFoundView from '@/components/views/NotFoundView';
import AuthLayout from '@/layouts/default/AuthLayout';
import DefaultLayout from '@/layouts/default/DefaultLayout.tsx';
import OrganizationSettingsView from './components/views/OrganizationSettingsView';
import InvoicesView from './components/views/InvoicesView';
import ProfileSettingsView from './components/views/ProfileSettingsView';

export default function AppRoutes() {
    return (
        <Routes>
            <Route element={<DefaultLayout></DefaultLayout>}>
                <Route path="/" element={<HomeView />} />
                <Route path="/demo" element={<DemoView />} />
                <Route path="/register" element={<RegisterOrganizationView />} />
            </Route>

            <Route
                element={
                    <AuthGuard>
                        <AuthLayout />
                    </AuthGuard>
                }
            >
                {/* user menu */}
                <Route path="/profile" element={<ProfileSettingsView/>} />

                <Route path="/dashboard/*" element={<DashboardView/>} />
                <Route path="/structure/*" element={<OrganizationSettingsView />}/>

                {/* receipts/invoices */}
                <Route path="/receipts/new" element={<InvoicesView />}/>

                {/* Old navigation logic*/} 
                <Route path="/settings/*" element={<SettingsView />} />

                <Route path="*" element={<NotFoundView />} />
            </Route>
            <Route path="*" element={<NotFoundView />} />
        </Routes>
    );
}
