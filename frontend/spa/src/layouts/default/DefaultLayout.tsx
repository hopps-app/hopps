import { Outlet } from 'react-router-dom';

import LegalFooter from '@/components/common/LegalFooter/LegalFooter';
import Header from '@/layouts/default/Header.tsx';

function DefaultLayout() {
    return (
        <div className="flex flex-col mx-auto size-full max-w-[1360px] py-0 px-10">
            <Header />
            <div className="min-h-[calc(100vh-80px)] pb-9">
                <Outlet />
            </div>
            <LegalFooter />
        </div>
    );
}

export default DefaultLayout;
