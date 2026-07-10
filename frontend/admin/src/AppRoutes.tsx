import { Route, Routes } from 'react-router-dom';

import HomeView from '@/components/views/HomeView';
import AdminGuard from '@/guards/AdminGuard';
import AdminLayout from '@/layouts/AdminLayout';

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
                <Route path="/" element={<HomeView />} />
                {/* Admin destinations land here as menu-config.ts grows. */}
                <Route path="*" element={<HomeView />} />
            </Route>
        </Routes>
    );
}
