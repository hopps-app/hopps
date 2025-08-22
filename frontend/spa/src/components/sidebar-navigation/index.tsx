import * as React from 'react';

import DesktopSidebar from './desktop-sidebar';
import MobileSidebar from './mobile-sidebar';

const SidebarNavigation: React.FC = () => {
    const [isWideScreen, setIsWideScreen] = React.useState(false);

    React.useEffect(() => {
        const checkScreenWidth = () => {
            setIsWideScreen(window.innerWidth > 1400);
        };

        checkScreenWidth();
        window.addEventListener('resize', checkScreenWidth);
    }, []);

    return (
        <>
            <div className="hidden sm:block">
                <DesktopSidebar isWideScreen={isWideScreen} />
            </div>
            <div className="sm:hidden">
                <MobileSidebar />
            </div>
        </>
    );
};

export default SidebarNavigation;
