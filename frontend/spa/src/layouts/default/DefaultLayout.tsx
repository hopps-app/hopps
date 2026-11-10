import { Outlet } from 'react-router-dom';

import LegalFooter from '@/components/common/LegalFooter/LegalFooter';
import Header from '@/layouts/default/Header.tsx';

function DefaultLayout() {
    return (
        // At least as tall as the visible screen (dvh: without the mobile browser bars), with the content filling the rest,
        // so the legal links sit at the bottom of the screen when the page is shorter and follow the content otherwise.
        // The gap above them is the content's own bottom margin.
        <div className="flex flex-col mx-auto w-full min-h-dvh max-w-[1360px] py-0 px-10">
            <Header />
            <div className="flex-1">
                <Outlet />
            </div>
            <LegalFooter />
        </div>
    );
}

export default DefaultLayout;
