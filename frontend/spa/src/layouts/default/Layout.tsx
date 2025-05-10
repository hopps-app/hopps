import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import { Toaster } from '@/components/ui/shadecn/Toaster.tsx';
import DemoView from '@/components/views/DemoView.tsx';
import HomeView from '@/components/views/HomeView.tsx';
import NotFoundView from '@/components/views/NotFoundView.tsx';
import { RegisterOrganizationView } from '@/components/views/RegisterOrganizationView.tsx';
import SettingsView from '@/components/views/SettingsView.tsx';
import AuthGuard from '@/guards/AuthGuard.tsx';
import { useStore } from '@/store/store.ts';
import Banner from './Banner.tsx';
import Header from './Header.tsx';

function Layout() {
    const authStore = useStore();
    const isBannerVisible = !authStore.user;

    return (
        <>
            <Router>
                {isBannerVisible && <Banner />}
                <div className="flex flex-col mx-auto size-full" style={{ maxWidth: 1360, padding: '0 40px' }}>
                    <Header />
                    <div className="min-h-[calc(100vh-80px)] pb-9">
                        <Routes>
                            <Route path="/" element={<HomeView />} />
                            <Route path="/demo" element={<DemoView />} />
                            <Route path="/register" element={<RegisterOrganizationView />} />
                            <Route
                                path="/settings/*"
                                element={
                                    <AuthGuard>
                                        <SettingsView />
                                    </AuthGuard>
                                }
                            />

                            <Route path="*" element={<NotFoundView />} />
                        </Routes>
                    </div>
                </div>
            </Router>
            <Toaster />
        </>
    );
}

export default Layout;
