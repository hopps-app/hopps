import { useTranslation } from 'react-i18next';

import { MenuItem } from '@/components/SettingsPage/MenuItem.ts';
import SettingsPageMenu from '@/components/SettingsPage/SettingsPageMenu.tsx';
import Icon from '@/components/ui/Icon.tsx';
import { ActiveTabContext } from '@/context/ActiveTabContext.ts';

interface SettingsPageProps {
    menu: MenuItem[];
    activeTab: string;
    onActiveTabChanged: (value: string) => void;
    children: React.ReactNode;
}

function SettingsPage({ activeTab, menu, children, onActiveTabChanged }: SettingsPageProps) {
    const { t } = useTranslation();
    const activeItem = menu.find((item) => item.value === activeTab);
    const onChangeTab = (value: string) => {
        if (onActiveTabChanged) {
            onActiveTabChanged(value);
        }
    };

    return (
        <ActiveTabContext.Provider value={{ activeTab: activeItem, setActiveTab: onActiveTabChanged }}>
            <div className="settings-page flex flex-row bg-background-secondary rounded-[30px] shadow min-h-[calc(100vh-260px)] pb-5">
                <div className="settings-page__nav flex-shrink-0 w-[150px] md:w-[300px] border-0 border-r-2 border-r-separator">
                    <div className="px-4 pt-4">
                        <h1 className="flex flex-row gap-2 h-10 items-center">
                            <Icon icon="HamburgerMenu" size="md" />
                            {t('settingsPage.menu')}
                        </h1>

                        <hr />
                    </div>
                    <SettingsPageMenu items={menu} activeTab={activeTab} onChange={onChangeTab} />
                </div>
                <div className="settings-page__content w-full relative">
                    <div className="px-10 pt-4">{children}</div>
                </div>
            </div>
        </ActiveTabContext.Provider>
    );
}

export default SettingsPage;
