import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

import InvoicesView from './InvoicesView';
import OrganizationDetailsSettingsView from './OrganizationDetailsSettingsView';

import { MenuItem } from '@/components/SettingsPage/MenuItem.ts';
import SettingsPage from '@/components/SettingsPage/SettingsPage.tsx';
import { OrganizationSettingsView } from '@/components/views/OrganizationSettings';
import ProfileSettingsView from '@/components/views/ProfileSettingsView.tsx';
import languageService from '@/services/LanguageService.ts';

function SettingsView() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [navigationItems, setMenuItems] = useState<MenuItem[]>([]);
    const [activeTab, setActiveTab] = useState('profile');

    const currentLanguage = languageService.getLanguage();

    useEffect(() => {
        setMenuItems([
            { title: t('settings.menu.profile'), value: 'profile', icon: 'Avatar' },
            { title: t('settings.menu.ngoDetails'), value: 'ngo-details', icon: 'IdCard' },
            { title: t('settings.menu.organization'), value: 'organization', icon: 'Backpack' },
            { title: t('settings.menu.invoices'), value: 'invoices', icon: 'Archive' },
        ]);
    }, [currentLanguage, t]);

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
            {activeTab === 'ngo-details' && <OrganizationDetailsSettingsView />}
            {activeTab === 'organization' && <OrganizationSettingsView />}
            {activeTab === 'invoices' && <InvoicesView />}
        </SettingsPage>
    );
}

export default SettingsView;
