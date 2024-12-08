import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import SettingsPage from '@/components/SettingsPage/SettingsPage.tsx';
import ProfileSettingsView from '@/components/views/ProfileSettingsView.tsx';
import OrganizationSettingsView from '@/components/views/OrganizationSettingsView.tsx';
import { MenuItem } from '@/components/SettingsPage/MenuItem.ts';

const navigationItems: MenuItem[] = [
    { title: 'Profile', value: 'profile', icon: 'Avatar' },
    { title: 'Organization', value: 'organization', icon: 'Backpack' },
];

function SettingsView() {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(navigationItems[0].value);

    useEffect(() => {
        const path = location.pathname.split('/').pop();
        if (path && navigationItems.some((item) => item.value === path)) {
            setActiveTab(path);
        }
    }, [location]);

    const navigateTo = (tab: string) => {
        navigate(`/settings/${tab}`);
    };

    return (
        <SettingsPage menu={navigationItems} activeTab={activeTab} onActiveTabChanged={navigateTo}>
            {activeTab === 'profile' && <ProfileSettingsView />}
            {activeTab === 'organization' && <OrganizationSettingsView />}
        </SettingsPage>
    );
}

export default SettingsView;
