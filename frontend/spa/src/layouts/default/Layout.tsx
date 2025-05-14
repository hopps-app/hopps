import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Header from './Header.tsx';
import DemoView from '@/components/views/DemoView.tsx';
import HomeView from '@/components/views/HomeView.tsx';
import NotFoundView from '@/components/views/NotFoundView.tsx';
import SettingsView from '@/components/views/SettingsView.tsx';
import AuthGuard from '@/guards/AuthGuard.tsx';
import { Toaster } from '@/components/ui/shadecn/Toaster.tsx';
import { RegisterOrganizationView } from '@/components/views/RegisterOrganizationView.tsx';
import InvoicesView from '@/components/views/InvoicesView.tsx';

function Layout() {
    return (
        <>
            <Router>
                <div className="flex flex-col mx-auto size-full" style={{ maxWidth: 1360, padding: '0 40px' }}>
                    <Header />
                    <div className="min-h-[calc(100vh-80px)] pb-9">
                        <Routes>
                            <Route path="/" element={<HomeView />} />
                            <Route path="/demo" element={<DemoView />} />
                            <Route
                                path="/register"
                                element={
                                    <AuthGuard>
                                        <RegisterOrganizationView />
                                    </AuthGuard>
                                }
                            />
                            <Route
                                path="/settings/*"
                                element={
                                    <AuthGuard>
                                        <SettingsView />
                                    </AuthGuard>
                                }
                            />
                            <Route
                                path="/invoices"
                                element={
                                    <AuthGuard>
                                        <InvoicesView />
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
