import * as React from 'react';

import DesktopSidebar from './desktop-sidebar';

type SidebarNavigationProps = {
    collapsed: boolean;
    onToggle: () => void;
};

// Desktop-only for now: the admin/support tooling is not intended for phones,
// and there are no nav destinations to render yet.
const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ collapsed, onToggle }) => {
    return <DesktopSidebar collapsed={collapsed} onToggle={onToggle} />;
};

export default SidebarNavigation;
