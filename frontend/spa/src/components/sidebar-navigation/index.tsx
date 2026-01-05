import * as React from 'react';

import DesktopSidebar from './desktop-sidebar';
import MobileSidebar from './mobile-sidebar';

const SidebarNavigation: React.FC = () => {
    return (
        <>
            <div className="hidden sm:block">
                <DesktopSidebar />
            </div>
            <div className="sm:hidden">
                <MobileSidebar />
            </div>
        </>
    );
};

export default SidebarNavigation;
