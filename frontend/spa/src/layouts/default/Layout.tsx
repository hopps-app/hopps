import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import Header from './Header.tsx';
import Home from '@/views/Home.tsx';
import Demo from '@/views/Demo.tsx';
import Login from '@/views/Login.tsx';
import Banner from './Banner.tsx';
import NotFound from '@/views/NotFound.tsx';

function Layout() {
    return (
        <Router>
            <Banner />
            <div className="flex flex-col mx-auto size-full" style={{ maxWidth: 1360, padding: '0 40px' }}>
                <Header />
                <div className="min-h-[calc(100vh-80px-40px)] pt-20">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/demo" element={<Demo />} />
                        <Route path="/login" element={<Login />} />

                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default Layout;
