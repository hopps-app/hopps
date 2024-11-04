import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import Header from './Header.tsx';
import HomeView from '@/components/views/HomeView.tsx';
import DemoView from '@/components/views/DemoView.tsx';
import Banner from './Banner.tsx';
import NotFoundView from '@/components/views/NotFoundView.tsx';
import SettingsView from '@/components/views/SettingsView.tsx';
import AuthGuard from '@/guards/AuthGuard.tsx';

function Layout() {
    return (
        <Router>
            <Banner />
            <div className="flex flex-col mx-auto size-full" style={{ maxWidth: 1360, padding: '0 40px' }}>
                <Header />
                <div className="min-h-[calc(100vh-80px-40px)] pt-20">
                    <Routes>
                        <Route path="/" element={<HomeView />} />
                        <Route path="/demo" element={<DemoView />} />
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
    );
}

export default Layout;
