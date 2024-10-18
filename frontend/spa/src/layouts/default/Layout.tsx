import Header from './Header.tsx';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from '@/views/Home.tsx';
import Demo from '@/views/Demo.tsx';
import Banner from './Banner.tsx';

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
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default Layout;
