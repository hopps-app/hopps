import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import SettingsPage from '@/components/SettingsPage/SettingsPage.tsx';
import ProfileSettingsView from '@/components/views/ProfileSettingsView.tsx';
import OrganizationSettingsView from '@/components/views/OrganizationSettingsView.tsx';

const navigationItems = [
    { title: 'Profile', value: 'profile' },
    { title: 'Organization', value: 'organization' },
];

function SettingsView() {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(navigationItems[0].value);

    useEffect(() => {
        const path = location.pathname.split('/').pop();
        if (path && navigationItems.some((item) => item.value === path)) {
            console.log('ROUTE CHANGED', path);
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
