import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import SettingsPage from '@/components/SettingsPage/SettingsPage.tsx';
import ProfileSettingsView from '@/components/views/ProfileSettingsView.tsx';
import OrganizationSettingsView from '@/components/views/OrganizationSettingsView.tsx';
import { MenuItem } from '@/components/SettingsPage/MenuItem.ts';
import InvoicesView from './InvoicesView';
import languageService from '@/services/LanguageService.ts';

function SettingsView() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [navigationItems, setMenuItems] = useState<MenuItem[]>([]);
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => {
        setMenuItems([
            { title: t('settings.menu.profile'), value: 'profile', icon: 'Avatar' },
            { title: t('settings.menu.organization'), value: 'organization', icon: 'Backpack' },
            { title: t('settings.menu.invoices'), value: 'invoices', icon: 'Archive' },
        ]);
    }, [languageService.getLanguage()]);

    useEffect(() => {
        const path = location.pathname.split('/').pop();
        if (path && navigationItems.some((item) => item.value === path)) {
            setActiveTab(path);
        }
    }, [location, navigationItems]);

    const navigateTo = (tab: string) => {
        navigate(`/settings/${tab}`);
    };

    return (
        <SettingsPage menu={navigationItems} activeTab={activeTab} onActiveTabChanged={navigateTo}>
            {activeTab === 'profile' && <ProfileSettingsView />}
            {activeTab === 'organization' && <OrganizationSettingsView />}
            {activeTab === 'invoices' && <InvoicesView />}
        </SettingsPage>
    );
}

export default SettingsView;
