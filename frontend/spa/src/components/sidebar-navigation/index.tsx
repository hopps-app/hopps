import * as React from 'react';

import DesktopSidebar from './desktop-sidebar';
import MobileSidebar from './mobile-sidebar';

type SidebarNavigationProps = {
    collapsed: boolean;
    onToggle: () => void;
};

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ collapsed, onToggle }) => {
    return (
        <>
            <div className="hidden sm:block">
                <DesktopSidebar collapsed={collapsed} onToggle={onToggle} />
            </div>
            <div className="sm:hidden">
                <MobileSidebar />
            </div>
        </>
    );
};

export default SidebarNavigation;
