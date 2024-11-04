import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import Header from './Header.tsx';
import HomePage from '@/components/pages/HomePage.tsx';
import DemoPage from '@/components/pages/DemoPage.tsx';
import Banner from './Banner.tsx';
import NotFound from '@/components/pages/NotFound.tsx';
import SettingsPage from '@/components/pages/SettingsPage.tsx';

function Layout() {
    return (
        <Router>
            <Banner />
            <div className="flex flex-col mx-auto size-full" style={{ maxWidth: 1360, padding: '0 40px' }}>
                <Header />
                <div className="min-h-[calc(100vh-80px-40px)] pt-20">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/demo" element={<DemoPage />} />
                        <Route path="/settings" element={<SettingsPage />} />

                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default Layout;
